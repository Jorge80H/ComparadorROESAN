/**
 * emailGenerator.js — Genera el correo para el cliente
 * NUEVO COPY: corto, amable, rápido de leer.
 * Solo muestra la columna de la póliza ganadora en el cuerpo.
 * El Excel completo se adjunta por separado.
 */
import { fmtPeso, LINKS_PSE } from "./helpers";

/**
 * Genera el texto del correo al cliente.
 */
export function generarCorreo({
  cotizacionSeleccionada,
  todasCotizaciones,
  aseguradoraRecomendada,
  justificacionIA,
  datosExtra = {},
  accionIA = "",
  aseguradoraRenovacion = "",
  diferenciaPrima = 0,
  esNuevo = false,
}) {
  const cot = cotizacionSeleccionada;
  const tomador = cot?.tomador || datosExtra?.tomador || "[NOMBRE CLIENTE]";
  const placa = cot?.placa || datosExtra?.placa || "[PLACA]";
  const descripcion = cot?.descripcion_vehiculo || datosExtra?.descripcion_vehiculo || "[VEHÍCULO]";
  const aseguradora = (cot?.aseguradora || "Aseguradora").toUpperCase();
  const primaTotal = fmtPeso(cot?.prima_total);

  // ── Justificación ──
  const justificacion =
    datosExtra?.justificacion_adriana ||
    justificacionIA ||
    `Revisando las opciones del mercado, recomendamos ${aseguradora} por su excelente relación precio-cobertura.`;

  const lineas = [];

  // ── Encabezado ──
  lineas.push(`De: Autos Roesan <autos@roesan.com.co>`);
  lineas.push(`Para: [CORREO CLIENTE]`);
  lineas.push(`CC: comercial@roesan.com.co; tecnico@roesan.com.co`);

  if (esNuevo) {
    lineas.push(`Asunto: PROPUESTA POLIZA TODO RIESGO ${placa} ${tomador.toUpperCase()}`);
  } else {
    lineas.push(`Asunto: CONDICIONES DE RENOVACION POLIZA TODO RIESGO ${placa} ${tomador.toUpperCase()}`);
  }

  lineas.push("");

  // ── Cuerpo: CORTO Y AMABLE ──
  const nombreCorto = tomador.split(" ")[0]; // Solo primer nombre
  const nombreTrato = nombreCorto.charAt(0).toUpperCase() + nombreCorto.slice(1).toLowerCase();

  lineas.push(`Buenas tardes ${nombreTrato},`);
  lineas.push("");

  if (esNuevo) {
    lineas.push(
      `Le envío la propuesta de póliza TODO RIESGO para el vehículo ${descripcion.toUpperCase()} placa ${placa.toUpperCase()} a nombre de ${tomador.toUpperCase()}, para su revisión y aprobación.`
    );
  } else {
    lineas.push(
      `Confirmo que se aproxima la renovación de la póliza TODO RIESGO del vehículo ${descripcion.toUpperCase()} placa ${placa.toUpperCase()} a nombre de ${tomador.toUpperCase()}, envío propuesta para su revisión y aprobación.`
    );
  }
  lineas.push("");

  // ── Recomendación con estilo Adriana ──
  if (accionIA === "CAMBIAR" && aseguradoraRenovacion && !esNuevo) {
    lineas.push(
      `Revisando con las demás compañías, ${aseguradora} le ofrece una opción más económica, con excelentes coberturas y un valor de prima de ${primaTotal} anual.`
    );
    lineas.push("");
    lineas.push(
      `Si desea realizar el cambio de compañía, se debe diligenciar completamente el formato adjunto y enviarlo por este medio con copia de la cédula y tarjeta de propiedad. El vehículo debe ser inspeccionado.`
    );
    lineas.push("");
    lineas.push(`Si desea continuar con seguros ${aseguradoraRenovacion.toUpperCase()}, solo debe confirmar por este medio.`);
  } else if (accionIA === "RENOVAR" && !esNuevo) {
    lineas.push(
      `Revisando con las demás compañías, le recomendamos continuar con seguros ${aseguradora}, ya que sigue ofreciendo la mejor relación precio-cobertura con una prima de ${primaTotal}.`
    );
    lineas.push("");
    lineas.push(`Para renovar, solo debe confirmar por este medio.`);
  } else {
    lineas.push(
      `Revisando las mejores opciones del mercado, le recomendamos ${aseguradora} con una prima anual de ${primaTotal}.`
    );
  }
  lineas.push("");
  // lineas.push(justificacion); // Ya se integra en el copy anterior o se ajusta según sea necesario
  lineas.push("");

  // ── Link PSE ──
  let linkPSE = null;
  for (const [nombre, url] of Object.entries(LINKS_PSE)) {
    if (aseguradora.includes(nombre)) {
      linkPSE = url;
      break;
    }
  }
  if (linkPSE) {
    lineas.push(`Si desea puede realizar pago PSE en este link:`);
    lineas.push(linkPSE);
    lineas.push("");
  }

  // ── Detalle SOLO de la póliza ganadora ──
  lineas.push("─".repeat(60));
  lineas.push(`PROPUESTA ${aseguradora}`);
  lineas.push("─".repeat(60));
  lineas.push("");

  // Datos básicos
  lineas.push(`  Valor asegurado:       ${fmtPeso(cot?.valor_asegurado)}`);
  lineas.push("");

  // Coberturas principales
  const coberturas = cot?.coberturas || [];
  if (coberturas.length > 0) {
    lineas.push("  COBERTURAS:");
    for (const cob of coberturas) {
      const nombre = cob?.nombre || "";
      const valor = cob?.valor || "INCLUIDA";
      let valorFmt;
      try {
        const num = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
        valorFmt = isNaN(num) ? valor : fmtPeso(valor);
      } catch {
        valorFmt = valor;
      }
      lineas.push(`  • ${nombre.padEnd(45)} ${valorFmt}`);
    }
    lineas.push("");
  }

  // Deducibles
  const deducibles = cot?.deducibles || [];
  if (deducibles.length > 0) {
    lineas.push("  DEDUCIBLES:");
    for (const ded of deducibles) {
      lineas.push(`  • ${(ded?.cobertura || "").padEnd(45)} ${ded?.deducible || ""}`);
    }
    lineas.push("");
  }

  // Prima desglosada
  lineas.push("  PRIMA:");
  lineas.push(`  • Prima sin IVA:       ${fmtPeso(cot?.prima_neta)}`);
  if (cot?.valor_asistencia > 0) {
    lineas.push(`  • Valor Asistencia:    ${fmtPeso(cot?.valor_asistencia)}`);
  }
  lineas.push(`  • Gastos expedición:   ${fmtPeso(cot?.gastos_expedicion)}`);
  lineas.push(`  • IVA (Prima):         ${fmtPeso(cot?.iva)}`);
  if (cot?.iva_asistencia > 0) {
    lineas.push(`  • IVA (Asistencia):    ${fmtPeso(cot?.iva_asistencia)}`);
  }
  lineas.push(`  • PRIMA TOTAL ANUAL:   ${primaTotal}`);
  lineas.push("");

  // ── Nota adjunto ──
  lineas.push("");
  lineas.push("En el archivo adjunto encontrará el cuadro comparativo detallado con todas las opciones cotizadas para su revisión.");
  lineas.push("");
  lineas.push("RESUMEN DE OPCIONES:");
  lineas.push("");

  // Ordenar: renovación primero, luego de menor a mayor
  const renovaciones = todasCotizaciones.filter((c) => !c.error && c.es_renovacion);
  const resto = todasCotizaciones
    .filter((c) => !c.error && !c.es_renovacion)
    .sort((a, b) => {
      const pa = parseFloat(String(a.prima_total || 0).replace(/\./g, "").replace(",", ".")) || Infinity;
      const pb = parseFloat(String(b.prima_total || 0).replace(/\./g, "").replace(",", ".")) || Infinity;
      return pa - pb;
    });

  const ordenadas = [...renovaciones, ...resto];
  for (const c of ordenadas) {
    const nombre = (c.aseguradora || "Desconocida").toUpperCase();
    const esRenov = c.es_renovacion;
    const esSel = c === cotizacionSeleccionada;
    const etiqueta = esRenov ? `RENOVACIÓN ${nombre}` : nombre;
    const marca = esSel ? " ← OPCIÓN RECOMENDADA" : esRenov ? " (PÓLIZA ACTUAL)" : "";
    lineas.push(`  • ${etiqueta.padEnd(30)} ${fmtPeso(c.prima_total).padStart(15)}${marca}`);
  }
  lineas.push("");
  lineas.push("Quedamos atentos a sus comentarios.");
  lineas.push("");

  return lineas.join("\n");
}
