/**
 * generar-excel.js — Netlify Function
 * Genera el Excel comparativo "sábana" con TODAS las cotizaciones.
 * 
 * v2.1 — Secciones enriquecidas con coberturas_detalle granulares
 *         (RCE, pérdidas por daños/hurto con deducibles %, SMMLV, asistencias)
 */
import ExcelJS from "exceljs";

// Paleta ROESAN
const AZUL_OSCURO = "1E3A5F";
const VERDE_OK = "1B7A3E";
const AZUL_CLARO = "D6E4F7";
const VERDE_CLARO = "D6F0E0";
const GRIS_HEADER = "4A4A4A";
const GRIS_FILA = "F5F5F5";
const BLANCO = "FFFFFF";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { cotizaciones, aseguradora_seleccionada, nombre_cliente } = JSON.parse(event.body);

    if (!cotizaciones || cotizaciones.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No hay cotizaciones" }) };
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Comparativo Pólizas");

    // ── Ordenar cotizaciones ──
    const renovaciones = cotizaciones.filter((c) => c.es_renovacion);
    const resto = [...cotizaciones]
      .filter((c) => !c.es_renovacion)
      .sort((a, b) => toInt(a.prima_total) - toInt(b.prima_total));
    const ordenadas = [...renovaciones, ...resto];
    const selUpper = (aseguradora_seleccionada || "").toUpperCase();

    // ── Columnas: Concepto + una col por aseguradora ──
    const numCols = ordenadas.length + 1;
    ws.getColumn(1).width = 38;
    for (let i = 2; i <= numCols; i++) {
      ws.getColumn(i).width = 22;
    }

    let fila = 1;

    // ── ENCABEZADO ──
    ws.mergeCells(fila, 1, fila, numCols);
    const headerCell = ws.getCell(fila, 1);
    headerCell.value = "ROESAN — CUADRO COMPARATIVO DE PÓLIZAS";
    headerCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + AZUL_OSCURO } };
    headerCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(fila).height = 28;
    fila++;

    ws.mergeCells(fila, 1, fila, numCols);
    const subCell = ws.getCell(fila, 1);
    subCell.value = `Cliente: ${(nombre_cliente || "").toUpperCase()} | ROESAN — Seguros de Autos`;
    subCell.font = { name: "Calibri", size: 9, color: { argb: "FF555555" } };
    subCell.alignment = { horizontal: "center" };
    fila++;
    fila++;

    // ── ROW DE ASEGURADORAS ──
    setCellStyled(ws, fila, 1, "CONCEPTO", GRIS_HEADER, true, "FF" + BLANCO);
    for (let i = 0; i < ordenadas.length; i++) {
      const cot = ordenadas[i];
      const nombre = (cot.aseguradora || "").toUpperCase();
      const esRenov = cot.es_renovacion;
      const esSel = nombre === selUpper;
      const label = esRenov ? `🔄 RENOVACIÓN\n${nombre}` : esSel ? `⭐ RECOMENDADA\n${nombre}` : nombre;
      const plan = cot.nombre_plan ? `\n(${cot.nombre_plan})` : "";
      const bgColor = esRenov ? AZUL_OSCURO : esSel ? VERDE_OK : GRIS_HEADER;
      setCellStyled(ws, fila, i + 2, label + plan, bgColor, true, "FF" + BLANCO);
    }
    ws.getRow(fila).height = 40;
    fila++;

    // ── DATOS DEL VEHÍCULO ──
    fila = addSectionHeader(ws, fila, "DATOS DEL VEHÍCULO", numCols);
    const datosFields = [
      ["Tomador", "tomador"],
      ["Placa", "placa"],
      ["Modelo", "modelo"],
      ["Vehículo", "descripcion_vehiculo"],
      ["Vigencia Desde", "vigencia_desde"],
      ["Vigencia Hasta", "vigencia_hasta"],
      ["Zona Circulación", "zona_circulacion"],
    ];
    for (const [label, field] of datosFields) {
      setConceptRow(ws, fila, label, ordenadas, (c) => c[field] || "—", selUpper);
      fila++;
    }
    fila++;

    // ── VALORES ASEGURADOS ──
    fila = addSectionHeader(ws, fila, "VALORES ASEGURADOS", numCols);
    setConceptRow(ws, fila, "Valor asegurado", ordenadas, (c) => fmtPeso(c.valor_asegurado), selUpper);
    fila++;
    fila++;

    // ── PRIMA ──
    fila = addSectionHeader(ws, fila, "PRIMA", numCols);
    const primaFields = [
      ["Prima sin IVA", "prima_neta"],
      ["Valor Asistencia", "valor_asistencia"],
      ["Gastos Expedición", "gastos_expedicion"],
      ["IVA (Prima)", "iva"],
      ["IVA (Asistencia)", "iva_asistencia"],
      ["PRIMA TOTAL ANUAL", "prima_total"],
    ];
    for (const [label, field] of primaFields) {
      const isBold = field === "prima_total";
      setConceptRow(ws, fila, label, ordenadas, (c) => fmtPeso(c[field]), selUpper, isBold);
      fila++;
    }
    fila++;

    // ── RESPONSABILIDAD CIVIL EXTRACONTRACTUAL (RCE) ──
    const tieneDetalle = ordenadas.some((c) => c.coberturas_detalle);
    if (tieneDetalle) {
      fila = addSectionHeader(ws, fila, "RESPONSABILIDAD CIVIL EXTRACONTRACTUAL (RCE)", numCols);
      setConceptRow(ws, fila, "Límite máximo", ordenadas,
        (c) => fmtPeso(cd(c).rce.limite), selUpper);
      fila++;
      setConceptRow(ws, fila, "Deducible", ordenadas,
        (c) => {
          const rce = cd(c).rce;
          if (rce.sin_deducible) return "SIN DEDUCIBLE";
          return fmtDeducible(rce.deducible_pct, rce.deducible_smmlv);
        }, selUpper);
      fila++;
      fila++;

      // ── PÉRDIDA POR DAÑOS ──
      fila = addSectionHeader(ws, fila, "PÉRDIDA POR DAÑOS", numCols);
      setConceptRow(ws, fila, "Total - Valor asegurado", ordenadas,
        (c) => fmtPeso(cd(c).perdida_total_danios.valor_asegurado), selUpper);
      fila++;
      setConceptRow(ws, fila, "Total - Deducible", ordenadas,
        (c) => fmtDeducible(cd(c).perdida_total_danios.deducible_pct, cd(c).perdida_total_danios.deducible_smmlv), selUpper);
      fila++;
      setConceptRow(ws, fila, "Parcial - Valor asegurado", ordenadas,
        (c) => fmtPeso(cd(c).perdida_parcial_danios.valor_asegurado), selUpper);
      fila++;
      setConceptRow(ws, fila, "Parcial - Deducible", ordenadas,
        (c) => fmtDeducible(cd(c).perdida_parcial_danios.deducible_pct, cd(c).perdida_parcial_danios.deducible_smmlv), selUpper);
      fila++;
      fila++;

      // ── PÉRDIDA POR HURTO ──
      fila = addSectionHeader(ws, fila, "PÉRDIDA POR HURTO", numCols);
      setConceptRow(ws, fila, "Total - Deducible", ordenadas,
        (c) => fmtDeducible(cd(c).perdida_total_hurto.deducible_pct, cd(c).perdida_total_hurto.deducible_smmlv), selUpper);
      fila++;
      setConceptRow(ws, fila, "Parcial - Deducible", ordenadas,
        (c) => fmtDeducible(cd(c).perdida_parcial_hurto.deducible_pct, cd(c).perdida_parcial_hurto.deducible_smmlv), selUpper);
      fila++;
      fila++;

      // ── COBERTURAS Y ASISTENCIAS ADICIONALES ──
      fila = addSectionHeader(ws, fila, "COBERTURAS Y ASISTENCIAS ADICIONALES", numCols);
      setConceptRow(ws, fila, "Terremoto / Eventos naturales", ordenadas,
        (c) => chk(cd(c).terremoto), selUpper);
      fila++;
      setConceptRow(ws, fila, "Protección patrimonial", ordenadas,
        (c) => chk(cd(c).proteccion_patrimonial), selUpper);
      fila++;
      setConceptRow(ws, fila, "Asistencia jurídica penal", ordenadas,
        (c) => fmtJuridica(cd(c).asistencia_juridica_penal, cd(c).asistencia_juridica_penal_valor), selUpper);
      fila++;
      setConceptRow(ws, fila, "Asistencia jurídica civil", ordenadas,
        (c) => fmtJuridica(cd(c).asistencia_juridica_civil, cd(c).asistencia_juridica_civil_valor), selUpper);
      fila++;
      setConceptRow(ws, fila, "Lucro cesante", ordenadas,
        (c) => chk(cd(c).lucro_cesante), selUpper);
      fila++;
      setConceptRow(ws, fila, "Accidentes personales conductor", ordenadas,
        (c) => fmtPeso(cd(c).accidentes_personales_conductor), selUpper);
      fila++;
      setConceptRow(ws, fila, "Asistencia en viaje", ordenadas,
        (c) => chk(cd(c).asistencia_en_viaje), selUpper);
      fila++;
      setConceptRow(ws, fila, "Vehículo sustituto", ordenadas,
        (c) => chk(cd(c).vehiculo_sustituto), selUpper);
      fila++;
      setConceptRow(ws, fila, "Gastos de transporte", ordenadas,
        (c) => chk(cd(c).gastos_transporte), selUpper);
      fila++;
      setConceptRow(ws, fila, "Cobertura de vidrios", ordenadas,
        (c) => chk(cd(c).cobertura_vidrios), selUpper);
      fila++;
      fila++;
    }

    // ── COBERTURAS (lista genérica - siempre presente) ──
    const todasCobs = [];
    for (const c of ordenadas) {
      for (const cob of c.coberturas || []) {
        if (cob.nombre && !todasCobs.includes(cob.nombre)) todasCobs.push(cob.nombre);
      }
    }
    if (todasCobs.length > 0) {
      fila = addSectionHeader(ws, fila, "DETALLE AMPAROS / COBERTURAS", numCols);
      for (const cobNombre of todasCobs) {
        setConceptRow(
          ws, fila, cobNombre, ordenadas,
          (c) => {
            const found = (c.coberturas || []).find((x) => x.nombre === cobNombre);
            if (!found) return "—";
            const v = found.valor;
            if (typeof v === "string" && isNaN(v.replace(/\./g, "").replace(",", "."))) return v;
            return fmtPeso(v);
          },
          selUpper
        );
        fila++;
      }
      fila++;
    }

    // ── DEDUCIBLES (lista genérica) ──
    const todasDeds = [];
    for (const c of ordenadas) {
      for (const d of c.deducibles || []) {
        if (d.cobertura && !todasDeds.includes(d.cobertura)) todasDeds.push(d.cobertura);
      }
    }
    if (todasDeds.length > 0) {
      fila = addSectionHeader(ws, fila, "DETALLE DEDUCIBLES", numCols);
      for (const dedNombre of todasDeds) {
        setConceptRow(
          ws, fila, dedNombre, ordenadas,
          (c) => {
            const found = (c.deducibles || []).find((x) => x.cobertura === dedNombre);
            return found ? found.deducible : "—";
          },
          selUpper
        );
        fila++;
      }
    }

    // ── Generar buffer ──
    const buffer = await wb.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        excel_base64: base64,
        filename: `COMPARATIVO_${(nombre_cliente || "CLIENTE").toUpperCase().replace(/\s+/g, "_")}.xlsx`,
      }),
    };
  } catch (error) {
    console.error("Error en generar-excel:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error.message || error) }),
    };
  }
}

// ── Helpers ──

function toInt(val) {
  if (val === null || val === undefined) return 0;
  try {
    const s = String(val).replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "").trim();
    return parseInt(parseFloat(s)) || 0;
  } catch {
    return 0;
  }
}

function fmtPeso(val) {
  const n = toInt(val);
  if (n === 0) return "—";
  return "$ " + n.toLocaleString("es-CO");
}

/** Acceso seguro a coberturas_detalle con defaults */
function cd(cot) {
  const d = cot.coberturas_detalle;
  if (d) return d;
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

/** Formatea deducible como "10% / mín. 3 SMMLV" */
function fmtDeducible(pct, smmlv) {
  const parts = [];
  if (pct && pct > 0) parts.push(`${pct}%`);
  if (smmlv && smmlv > 0) parts.push(`mín. ${smmlv} SMMLV`);
  if (parts.length === 0) return "—";
  return parts.join(" / ");
}

/** Booleano → "Sí ampara" o "—" */
function chk(val) {
  return val ? "Sí ampara" : "—";
}

/** Muestra valor monetario si existe, o "Sí ampara" / "—" */
function fmtJuridica(boolVal, valor) {
  if (valor && valor > 0) return fmtPeso(valor);
  return chk(boolVal);
}

function setCellStyled(ws, row, col, value, bgColor, bold = false, fontColor = "FF222222") {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = { name: "Calibri", size: 10, bold, color: { argb: fontColor } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgColor } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder();
}

function addSectionHeader(ws, fila, title, numCols) {
  ws.mergeCells(fila, 1, fila, numCols);
  const cell = ws.getCell(fila, 1);
  cell.value = title;
  cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + BLANCO } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_OSCURO } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  cell.border = thinBorder();
  ws.getRow(fila).height = 22;
  return fila + 1;
}

function setConceptRow(ws, fila, label, ordenadas, getValue, selUpper, bold = false) {
  // Concepto
  const conceptCell = ws.getCell(fila, 1);
  conceptCell.value = label;
  conceptCell.font = { name: "Calibri", size: 9, bold: true };
  conceptCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
  conceptCell.border = thinBorder();
  conceptCell.alignment = { vertical: "middle" };

  // Valores
  for (let i = 0; i < ordenadas.length; i++) {
    const cot = ordenadas[i];
    const esSel = (cot.aseguradora || "").toUpperCase() === selUpper;
    const esRenov = cot.es_renovacion;
    const bgColor = esSel ? VERDE_CLARO : esRenov ? AZUL_CLARO : fila % 2 === 0 ? GRIS_FILA : BLANCO;

    const cell = ws.getCell(fila, i + 2);
    cell.value = getValue(cot);
    cell.font = { name: "Calibri", size: 9, bold };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgColor } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  }
  ws.getRow(fila).height = 16;
}

function thinBorder() {
  const side = { style: "thin", color: { argb: "FFCCCCCC" } };
  return { top: side, bottom: side, left: side, right: side };
}
