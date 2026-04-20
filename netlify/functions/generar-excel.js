/**
 * generar-excel.js — Netlify Function
 * Genera el Excel comparativo "sábana" con TODAS las cotizaciones.
 * Usa ExcelJS en lugar de openpyxl.
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
    const headerRow = ws.getRow(fila);
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
      ["Gastos Expedición", "gastos_expedicion"],
      ["IVA", "iva"],
      ["PRIMA TOTAL ANUAL", "prima_total"],
    ];
    for (const [label, field] of primaFields) {
      const isBold = field === "prima_total";
      setConceptRow(ws, fila, label, ordenadas, (c) => fmtPeso(c[field]), selUpper, isBold);
      fila++;
    }
    fila++;

    // ── COBERTURAS  ──
    // Recopilar unión de todas las coberturas
    const todasCobs = [];
    for (const c of ordenadas) {
      for (const cob of c.coberturas || []) {
        if (cob.nombre && !todasCobs.includes(cob.nombre)) todasCobs.push(cob.nombre);
      }
    }
    if (todasCobs.length > 0) {
      fila = addSectionHeader(ws, fila, "AMPAROS / COBERTURAS", numCols);
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

    // ── DEDUCIBLES ──
    const todasDeds = [];
    for (const c of ordenadas) {
      for (const d of c.deducibles || []) {
        if (d.cobertura && !todasDeds.includes(d.cobertura)) todasDeds.push(d.cobertura);
      }
    }
    if (todasDeds.length > 0) {
      fila = addSectionHeader(ws, fila, "DEDUCIBLES", numCols);
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
