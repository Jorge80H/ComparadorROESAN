import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: './v2/.env' });

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
    "coberturas": [
      {"nombre": "nombre cobertura", "valor": "valor numérico o INCLUIDA"}
    ],
    "deducibles": [
      {"cobertura": "nombre", "deducible": "valor o SIN DEDUCIBLE"}
    ]
  }
]

REGLAS IMPORTANTES:
- Los valores numéricos (prima_neta, iva, prima_total, etc.) DEBEN ser NÚMEROS ENTEROS SIN puntos ni comas ni símbolo $. Ejemplo: 1288331
- Si prima_total es 0, REVISA DE NUEVO el documento. Es CASI IMPOSIBLE que una cotización tenga prima $0.
- Las listas coberturas y deducibles pueden estar vacías: []

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

async function testExtraction(filePath) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY NOT FOUND");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const pdfData = fs.readFileSync(filePath);
    const pdfBase64 = pdfData.toString('base64');

    console.log(`Processing file: ${path.basename(filePath)}...`);

    const result = await model.generateContent([
        EXTRACTION_PROMPT + `\nNombre del archivo: ${path.basename(filePath)}`,
        {
            inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf"
            }
        }
    ]);

    console.log(`Result for ${path.basename(filePath)}:`);
    console.log(result.response.text());
}

async function run() {
    const files = [
        'c:/Users/lu_br/Downloads/ROESAN_COMPARADOR_V1/DOCUMENTOS_EJEMPLO/ejemplo01/RENOVACION BOLIVAR IXN999 MANUEL ANTONIO ORTIZ.pdf',
        'c:/Users/lu_br/Downloads/ROESAN_COMPARADOR_V1/DOCUMENTOS_EJEMPLO/ejemplo01/COTIZACION AXA IXN999 MANUEL ANTONIO ORTIZ.pdf'
    ];

    for (const file of files) {
        await testExtraction(file);
    }
}

run();
