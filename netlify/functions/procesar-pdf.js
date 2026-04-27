/**
 * procesar-pdf.js — Netlify Function
 * Recibe un PDF como base64, lo envía directamente a Gemini para extracción.
 * NO usa pdfplumber — Gemini lee el PDF nativamente.
 * 
 * v2.1 — Prompt enriquecido con estructura de coberturas granulares
 *         inspirada en comparativo.py (deducibles %, SMMLV, RCE, etc.)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const EXTRACTION_PROMPT = `
Eres un asistente experto en análisis de pólizas de seguros de autos en Colombia.

Recibes un archivo PDF de una cotización de seguro de automóvil, junto con el nombre original del archivo y el género del asegurado.
Extrae la información y responde ÚNICA Y EXCLUSIVAMENTE con un JSON válido que contenga un ARREGLO (lista) de objetos.
NO incluyas texto antes o después del JSON. NO uses bloques de código markdown.

Cada objeto en el arreglo JSON debe tener EXACTAMENTE estas claves (usa null si no encuentras el valor):
[
  {
    "aseguradora": "nombre de la compañía",
    "nombre_plan": "nombre del plan o producto (ej: Super Trébol, Autos Plus, Llave en Mano, Seguro Elite)",
    "prima_neta": 0,
    "gastos_expedicion": 0,
    "iva": 0,
    "prima_total": 0,
    "valor_asegurado": 0,
    "tomador": "nombre completo",
    "placa": "placa",
    "modelo": "año",
    "descripcion_vehiculo": "marca y modelo",
    "vigencia_desde": "DD/MM/YYYY",
    "vigencia_hasta": "DD/MM/YYYY",
    "zona_circulacion": "ciudad",

    "coberturas_detalle": {
      "rce": {
        "limite": 0,
        "deducible_pct": 0,
        "deducible_smmlv": 0,
        "sin_deducible": false
      },
      "perdida_total_danios": {
        "valor_asegurado": 0,
        "deducible_pct": 0,
        "deducible_smmlv": 0
      },
      "perdida_parcial_danios": {
        "valor_asegurado": 0,
        "deducible_pct": 0,
        "deducible_smmlv": 0
      },
      "perdida_total_hurto": {
        "valor_asegurado": 0,
        "deducible_pct": 0,
        "deducible_smmlv": 0
      },
      "perdida_parcial_hurto": {
        "valor_asegurado": 0,
        "deducible_pct": 0,
        "deducible_smmlv": 0
      },
      "terremoto": false,
      "proteccion_patrimonial": false,
      "asistencia_juridica_penal": false,
      "asistencia_juridica_penal_valor": 0,
      "asistencia_juridica_civil": false,
      "asistencia_juridica_civil_valor": 0,
      "lucro_cesante": false,
      "accidentes_personales_conductor": 0,
      "asistencia_en_viaje": false,
      "vehiculo_sustituto": false,
      "gastos_transporte": false,
      "cobertura_vidrios": false
    },

    "coberturas": [
      {"nombre": "nombre cobertura", "valor": "valor numérico o INCLUIDA"}
    ],
    "deducibles": [
      {"cobertura": "nombre", "deducible": "valor o SIN DEDUCIBLE"}
    ]
  }
]

INSTRUCCIONES PARA "coberturas_detalle":
- "rce" = Responsabilidad Civil Extracontractual. "limite" es el valor máximo de cobertura en pesos.
- Los campos "deducible_pct" son el porcentaje del deducible (ej: 10 = 10%).
- Los campos "deducible_smmlv" son el mínimo en Salarios Mínimos Mensuales (ej: 2 = 2 SMMLV).
- Si dice "SIN DEDUCIBLE", pon deducible_pct=0, deducible_smmlv=0 y sin_deducible=true.
- "accidentes_personales_conductor" es el valor asegurado en pesos para esa cobertura.
- "asistencia_juridica_penal_valor" y "asistencia_juridica_civil_valor" son montos en pesos si se especifican.
- Los campos booleanos (terremoto, proteccion_patrimonial, etc.) son true si la cobertura está incluida/amparada.
- Si no encuentras un dato, usa 0 para números y false para booleanos.

INSTRUCCIONES PARA "coberturas" y "deducibles":
- Estas listas son un respaldo. Lista TODAS las coberturas y deducibles que aparezcan en el documento.
- Las listas pueden estar vacías: []

REGLAS DE VALORES NUMÉRICOS:
- Los valores numéricos (prima_neta, iva, prima_total, etc.) DEBEN ser NÚMEROS ENTEROS SIN puntos ni comas ni símbolo $. Ejemplo: 1288331
- Si prima_total es 0, REVISA DE NUEVO el documento. Es CASI IMPOSIBLE que una cotización tenga prima $0.

REGLAS POR ASEGURADORA:

ALLIANZ:
- Si el modelo del vehículo es 2025, 2026 o 2027: extraer DOS cotizaciones separadas: "Autos llave en mano" y "Autos Plus"
- Si el modelo es anterior a 2025: extraer SOLO "Autos Plus"
- DEBES incluir TODOS los campos numéricos (prima_neta, iva, prima_total). Si ves datos, NO los dejes en 0.

MAPFRE:
- PARÁMETRO GÉNERO: "{genero}"
- PARÁMETRO ANTIGÜEDAD VEHÍCULO: "{antiguedad}" años
- Si la antigüedad del vehículo es 3 años o menos: extraer la cotización "Llave en Mano" (NO la estándar)
- Si la antigüedad es mayor a 3 años: extraer la cotización estándar
- Si género = "HOMBRE": extraer SOLO la cotización "Super Trébol"
- Si género = "MUJER": extraer "Super Trébol" Y la cotización adicional que aparezca (ej: Super Trébol + Demostra). Retornar 2 cotizaciones.

SEGUROS DEL ESTADO (o "El Estado"):
- Extraer ÚNICAMENTE la opción "Seguro Elite para Auto". Ignorar las demás.

SURA:
- VALIDAR que prima_total > 0. Si todos los valores son 0, RE-LEER el documento con más cuidado.

REGLA DE ORO PARA LA ASEGURADORA:
Solo puedes escoger entre: Bolívar, AXA, Allianz, Seguros del Estado, HDI, MAPFRE, Qualitas, SURA, SBS, La Previsora.
Si no puedes determinar la aseguradora del contenido del PDF, USA EL NOMBRE DEL ARCHIVO.
¡POR NINGÚN MOTIVO INVENTES NOMBRES DE ASEGURADORAS!
`;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { pdfBase64, fileName, genero, modeloVehiculo } = JSON.parse(event.body);

    if (!pdfBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No se recibió el PDF" }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY no configurada" }) };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // Calcular antigüedad del vehículo
    const anioActual = new Date().getFullYear();
    const anioModelo = parseInt(modeloVehiculo) || anioActual;
    const antiguedad = anioActual - anioModelo;

    // Construir prompt con parámetros
    const promptFinal = EXTRACTION_PROMPT
      .replace("{genero}", genero || "NO ESPECIFICADO")
      .replace("{antiguedad}", String(antiguedad));

    // Enviar PDF directamente a Gemini
    const result = await model.generateContent([
      promptFinal + `\nNombre del archivo: ${fileName}`,
      {
        inlineData: {
          data: pdfBase64,
          mimeType: "application/pdf",
        },
      },
    ]);

    const rawText = result.response.text();
    let cotizaciones;

    try {
      cotizaciones = JSON.parse(rawText);
    } catch {
      // Intentar extraer JSON del texto
      const match = rawText.match(/\[[\s\S]*\]/) || rawText.match(/\{[\s\S]*\}/);
      if (match) {
        cotizaciones = JSON.parse(match[0]);
      } else {
        throw new Error("No se pudo parsear la respuesta de Gemini");
      }
    }

    // Asegurar que sea array
    if (!Array.isArray(cotizaciones)) {
      cotizaciones = [cotizaciones];
    }

    // Normalizar cada cotización
    const normalizadas = cotizaciones.map((c) => ({
      archivo: fileName,
      aseguradora: String(c.aseguradora || "Desconocida").trim(),
      nombre_plan: String(c.nombre_plan || "").trim(),
      prima_neta: toInt(c.prima_neta),
      gastos_expedicion: toInt(c.gastos_expedicion),
      iva: toInt(c.iva),
      prima_total: toInt(c.prima_total),
      valor_asegurado: toInt(c.valor_asegurado),
      tomador: String(c.tomador || "").trim(),
      placa: String(c.placa || "").trim(),
      modelo: String(c.modelo || "").trim(),
      descripcion_vehiculo: String(c.descripcion_vehiculo || "").trim(),
      vigencia_desde: String(c.vigencia_desde || "").trim(),
      vigencia_hasta: String(c.vigencia_hasta || "").trim(),
      zona_circulacion: String(c.zona_circulacion || "BOGOTÁ").trim(),
      coberturas_detalle: normalizarCoberturasDetalle(c.coberturas_detalle),
      coberturas: Array.isArray(c.coberturas) ? c.coberturas : [],
      deducibles: Array.isArray(c.deducibles) ? c.deducibles : [],
    }));

    // Validar SURA: si prima_total es 0, marcar advertencia
    for (const cot of normalizadas) {
      if (cot.aseguradora.toUpperCase() === "SURA" && cot.prima_total === 0) {
        cot._advertencia = "SURA: prima_total extraída como 0. Verificar manualmente.";
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotizaciones: normalizadas }),
    };
  } catch (error) {
    console.error("Error en procesar-pdf:", error);

    // Manejar rate limit
    const esRateLimit = String(error).includes("429") || String(error).includes("quota");
    if (esRateLimit) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: "Rate limit de Gemini alcanzado. Espera unos segundos e intenta de nuevo.",
          retry: true,
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error.message || error) }),
    };
  }
}

function toInt(val) {
  if (val === null || val === undefined) return 0;
  try {
    const s = String(val).replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "").trim();
    return parseInt(parseFloat(s)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Normaliza el objeto coberturas_detalle que viene de Gemini.
 * Asegura que todos los campos existan con defaults sensatos.
 */
function normalizarCoberturasDetalle(cd) {
  if (!cd || typeof cd !== "object") {
    return defaultCoberturasDetalle();
  }

  const rce = cd.rce || {};
  const ptd = cd.perdida_total_danios || {};
  const ppd = cd.perdida_parcial_danios || {};
  const pth = cd.perdida_total_hurto || {};
  const pph = cd.perdida_parcial_hurto || {};

  return {
    rce: {
      limite: toInt(rce.limite),
      deducible_pct: toFloat(rce.deducible_pct),
      deducible_smmlv: toFloat(rce.deducible_smmlv),
      sin_deducible: Boolean(rce.sin_deducible),
    },
    perdida_total_danios: {
      valor_asegurado: toInt(ptd.valor_asegurado),
      deducible_pct: toFloat(ptd.deducible_pct),
      deducible_smmlv: toFloat(ptd.deducible_smmlv),
    },
    perdida_parcial_danios: {
      valor_asegurado: toInt(ppd.valor_asegurado),
      deducible_pct: toFloat(ppd.deducible_pct),
      deducible_smmlv: toFloat(ppd.deducible_smmlv),
    },
    perdida_total_hurto: {
      valor_asegurado: toInt(pth.valor_asegurado),
      deducible_pct: toFloat(pth.deducible_pct),
      deducible_smmlv: toFloat(pth.deducible_smmlv),
    },
    perdida_parcial_hurto: {
      valor_asegurado: toInt(pph.valor_asegurado),
      deducible_pct: toFloat(pph.deducible_pct),
      deducible_smmlv: toFloat(pph.deducible_smmlv),
    },
    terremoto: Boolean(cd.terremoto),
    proteccion_patrimonial: Boolean(cd.proteccion_patrimonial),
    asistencia_juridica_penal: Boolean(cd.asistencia_juridica_penal),
    asistencia_juridica_penal_valor: toInt(cd.asistencia_juridica_penal_valor),
    asistencia_juridica_civil: Boolean(cd.asistencia_juridica_civil),
    asistencia_juridica_civil_valor: toInt(cd.asistencia_juridica_civil_valor),
    lucro_cesante: Boolean(cd.lucro_cesante),
    accidentes_personales_conductor: toInt(cd.accidentes_personales_conductor),
    asistencia_en_viaje: Boolean(cd.asistencia_en_viaje),
    vehiculo_sustituto: Boolean(cd.vehiculo_sustituto),
    gastos_transporte: Boolean(cd.gastos_transporte),
    cobertura_vidrios: Boolean(cd.cobertura_vidrios),
  };
}

function defaultCoberturasDetalle() {
  return {
    rce: { limite: 0, deducible_pct: 0, deducible_smmlv: 0, sin_deducible: false },
    perdida_total_danios: { valor_asegurado: 0, deducible_pct: 0, deducible_smmlv: 0 },
    perdida_parcial_danios: { valor_asegurado: 0, deducible_pct: 0, deducible_smmlv: 0 },
    perdida_total_hurto: { valor_asegurado: 0, deducible_pct: 0, deducible_smmlv: 0 },
    perdida_parcial_hurto: { valor_asegurado: 0, deducible_pct: 0, deducible_smmlv: 0 },
    terremoto: false,
    proteccion_patrimonial: false,
    asistencia_juridica_penal: false,
    asistencia_juridica_penal_valor: 0,
    asistencia_juridica_civil: false,
    asistencia_juridica_civil_valor: 0,
    lucro_cesante: false,
    accidentes_personales_conductor: 0,
    asistencia_en_viaje: false,
    vehiculo_sustituto: false,
    gastos_transporte: false,
    cobertura_vidrios: false,
  };
}

function toFloat(val) {
  if (val === null || val === undefined) return 0;
  try {
    return parseFloat(val) || 0;
  } catch {
    return 0;
  }
}
