/**
 * generar-excel.js — Netlify Function
 * Genera el Excel comparativo "sábana" con TODAS las cotizaciones.
 * Formato final listo para enviar al cliente (igual al que prepara Adriana).
 */
import ExcelJS from "exceljs";

// ── Paleta ROESAN ──
const AZUL_OSCURO  = "1E3A5F";
const VERDE_OK     = "1B7A3E";
const GRIS_HEADER  = "4A4A4A";
const VERDE_CLARO  = "D6F0E0";
const AZUL_CLARO   = "D6E4F7";
const GRIS_FILA    = "F5F5F5";
const BLANCO       = "FFFFFF";

// ── Anchos de columna por posición (col A fija, B-J variables) ──
const COL_A_WIDTH = 38;
const COL_DATA_WIDTH = 26; // ancho uniforme para columnas de aseguradoras

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
    wb.creator = "ROESAN";
    wb.created = new Date();

    const ws = wb.addWorksheet("Comparativo Pólizas", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // ── Ordenar: renovación primero, resto por prima total ascendente ──
    const renovaciones = cotizaciones.filter((c) => c.es_renovacion);
    const resto = [...cotizaciones]
      .filter((c) => !c.es_renovacion)
      .sort((a, b) => toInt(a.prima_total) - toInt(b.prima_total));
    const ordenadas = [...renovaciones, ...resto];
    const selUpper = (aseguradora_seleccionada || "").toUpperCase();

    const numCols = ordenadas.length + 1; // columna A + una por aseguradora

    // ── Anchos de columnas ──
    ws.getColumn(1).width = COL_A_WIDTH;
    for (let i = 2; i <= numCols; i++) {
      ws.getColumn(i).width = COL_DATA_WIDTH;
    }

    let fila = 1;

    // ─────────────────────────────────────────────
    // ENCABEZADO PRINCIPAL
    // ─────────────────────────────────────────────
    ws.mergeCells(fila, 1, fila, numCols);
    const headerCell = ws.getCell(fila, 1);
    headerCell.value = "ROESAN — CUADRO COMPARATIVO DE PÓLIZAS";
    headerCell.font  = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + AZUL_OSCURO } };
    headerCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(fila).height = 28;
    fila++;

    ws.mergeCells(fila, 1, fila, numCols);
    const subCell = ws.getCell(fila, 1);
    subCell.value = `Cliente: ${(nombre_cliente || "").toUpperCase()} | ROESAN — Seguros de Autos`;
    subCell.font  = { name: "Calibri", size: 9, color: { argb: "FF555555" } };
    subCell.alignment = { horizontal: "center" };
    fila++;
    fila++; // fila 3 vacía

    // ─────────────────────────────────────────────
    // CABECERA DE ASEGURADORAS (fila 4)
    // ─────────────────────────────────────────────
    setCellStyled(ws, fila, 1, "CONCEPTO", GRIS_HEADER, true, "FF" + BLANCO);
    for (let i = 0; i < ordenadas.length; i++) {
      const cot     = ordenadas[i];
      const nombre  = (cot.aseguradora || "").toUpperCase();
      const esRenov = cot.es_renovacion;
      const esSel   = nombre === selUpper && !esRenov;
      const label   = esRenov
        ? `🔄 RENOVACIÓN\n${nombre}`
        : esSel
        ? `⭐ RECOMENDADA\n${nombre}`
        : nombre;
      const plan    = cot.nombre_plan ? `\n(${cot.nombre_plan})` : "";
      const bgColor = esRenov ? AZUL_OSCURO : esSel ? VERDE_OK : GRIS_HEADER;
      setCellStyled(ws, fila, i + 2, label + plan, bgColor, true, "FF" + BLANCO);
    }
    ws.getRow(fila).height = 40;
    fila++;

    // ─────────────────────────────────────────────
    // 1. DATOS DEL VEHÍCULO
    // ─────────────────────────────────────────────
    fila = addSectionHeader(ws, fila, "DATOS DEL VEHÍCULO", numCols);
    const datosFields = [
      ["Tomador",          (c) => c.tomador               || "—"],
      ["Placa",            (c) => c.placa                  || "—"],
      ["Modelo",           (c) => c.modelo                 || "—"],
      ["Vehículo",         (c) => c.descripcion_vehiculo   || "—"],
      ["Vigencia Desde",   (c) => fmtFecha(c.vigencia_desde)],
      ["Vigencia Hasta",   (c) => fmtFecha(c.vigencia_hasta)],
      ["Zona Circulación", (c) => c.zona_circulacion       || "—"],
    ];
    for (const [label, getter] of datosFields) {
      setConceptRow(ws, fila, label, ordenadas, getter, selUpper);
      fila++;
    }
    fila++;

    // ─────────────────────────────────────────────
    // 2. VALORES ASEGURADOS
    // ─────────────────────────────────────────────
    fila = addSectionHeader(ws, fila, "VALORES ASEGURADOS", numCols);
    setConceptRow(ws, fila, "Valor asegurado", ordenadas, (c) => fmtPeso(c.valor_asegurado), selUpper);
    fila++;
    fila++;

    // ─────────────────────────────────────────────
    // 3. AMPAROS / COBERTURAS
    // ─────────────────────────────────────────────
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
            if (!v && v !== 0) return "—";
            // Si es texto no-numérico (ej: "INCLUIDA", "10 días PP / 15 días PT")
            const numVal = toInt(v);
            if (numVal === 0 && isNaN(Number(String(v).replace(/[$.,%\s]/g, "")))) return String(v);
            if (numVal === 0) return "—";
            return fmtPeso(v);
          },
          selUpper
        );
        fila++;
      }
      fila++;
    }

    // ─────────────────────────────────────────────
    // 4. DEDUCIBLES
    // ─────────────────────────────────────────────
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
            if (!found) return "—";
            return fmtDeducible(found.deducible);
          },
          selUpper
        );
        fila++;
      }
      fila++;
    }

    // ─────────────────────────────────────────────
    // 5. PRIMA (al final — igual que el formato de Adriana)
    // ─────────────────────────────────────────────
    fila = addSectionHeader(ws, fila, "PRIMA", numCols);
    const primaFields = [
      ["Prima sin IVA",      (c) => fmtPeso(c.prima_neta),        false],
      ["Valor Asistencia",   (c) => fmtPeso(c.valor_asistencia),  false],
      ["Gastos Expedición",  (c) => fmtPeso(c.gastos_expedicion), false],
      ["IVA (Prima)",        (c) => fmtPeso(c.iva),               false],
      ["IVA (Asistencia)",   (c) => fmtPeso(c.iva_asistencia),    false],
      ["PRIMA TOTAL ANUAL",  (c) => fmtPeso(c.prima_total),       true ],
    ];
    for (const [label, getter, bold] of primaFields) {
      setConceptRow(ws, fila, label, ordenadas, getter, selUpper, bold);
      fila++;
    }

    // ── Generar buffer y devolver base64 ──
    const buffer = await wb.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
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

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

/** Convierte cualquier valor monetario a entero */
function toInt(val) {
  if (val === null || val === undefined || val === "") return 0;
  try {
    const s = String(val)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim();
    return parseInt(parseFloat(s)) || 0;
  } catch {
    return 0;
  }
}

/** Formato pesos colombianos: $ 1.234.567 */
function fmtPeso(val) {
  const n = toInt(val);
  if (n === 0) return "—";
  return "$ " + n.toLocaleString("es-CO");
}

/**
 * Formatea un deducible: si es puramente numérico lo convierte a pesos,
 * si ya tiene texto (ej: "0%", "10% Min 1 SMMLV", "SIN DEDUCIBLE", "1 SMMLV") lo deja como está.
 */
function fmtDeducible(val) {
  if (!val && val !== 0) return "—";
  const s = String(val).trim();
  if (s === "" || s === "—") return "—";
  // Si es puramente numérico (ej: 1200000) → formato pesos
  if (/^\d+$/.test(s)) return fmtPeso(Number(s));
  // Si ya tiene texto legible, respetar tal cual (mayúsculas)
  return s.toUpperCase().startsWith("SIN") || s.toUpperCase().includes("SMMLV") || s.includes("%")
    ? s
    : s;
}

/** Formatea fechas: '2026-04-07 00:00:00' o '07/04/2026' → '07/04/2026' */
function fmtFecha(val) {
  if (!val) return "—";
  const s = String(val).trim();
  // ya viene en formato dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // viene como yyyy-mm-dd ... o Date ISO
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
}

/** Celda con fondo de color, texto blanco centrado */
function setCellStyled(ws, row, col, value, bgColor, bold = false, fontColor = "FF222222") {
  const cell = ws.getCell(row, col);
  cell.value     = value;
  cell.font      = { name: "Calibri", size: 10, bold, color: { argb: fontColor } };
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgColor } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border    = thinBorder();
}

/** Fila de sección (fondo azul oscuro, texto blanco, fusionada) */
function addSectionHeader(ws, fila, title, numCols) {
  ws.mergeCells(fila, 1, fila, numCols);
  const cell = ws.getCell(fila, 1);
  cell.value     = title;
  cell.font      = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + BLANCO } };
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + AZUL_OSCURO } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  cell.border    = thinBorder();
  ws.getRow(fila).height = 22;
  return fila + 1;
}

/** Fila de concepto: etiqueta en col A + valores en columnas de aseguradoras */
function setConceptRow(ws, fila, label, ordenadas, getValue, selUpper, bold = false) {
  // Columna A — etiqueta
  const conceptCell = ws.getCell(fila, 1);
  conceptCell.value     = label;
  conceptCell.font      = { name: "Calibri", size: 9, bold: true };
  conceptCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
  conceptCell.border    = thinBorder();
  conceptCell.alignment = { vertical: "middle" };

  // Columnas B..N — valores por aseguradora
  for (let i = 0; i < ordenadas.length; i++) {
    const cot     = ordenadas[i];
    const esSel   = (cot.aseguradora || "").toUpperCase() === selUpper && !cot.es_renovacion;
    const esRenov = cot.es_renovacion;
    const bgColor = esSel
      ? VERDE_CLARO
      : esRenov
      ? AZUL_CLARO
      : fila % 2 === 0
      ? GRIS_FILA
      : BLANCO;

    const cell = ws.getCell(fila, i + 2);
    cell.value     = getValue(cot);
    cell.font      = { name: "Calibri", size: 9, bold };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgColor } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = thinBorder();
  }
  ws.getRow(fila).height = 16;
}

/** Borde fino gris claro */
function thinBorder() {
  const side = { style: "thin", color: { argb: "FFCCCCCC" } };
  return { top: side, bottom: side, left: side, right: side };
}
