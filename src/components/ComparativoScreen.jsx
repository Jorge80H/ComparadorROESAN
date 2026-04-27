import { fmtPeso, numPrima, abreviarCobertura, ordenarCotizaciones } from "../lib/helpers";

/** Acceso seguro a coberturas_detalle */
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

function fmtDeducible(pct, smmlv) {
  const parts = [];
  if (pct && pct > 0) parts.push(`${pct}%`);
  if (smmlv && smmlv > 0) parts.push(`mín. ${smmlv} SMMLV`);
  if (parts.length === 0) return "—";
  return parts.join(" / ");
}

function chk(val) {
  return val ? "✅ Sí" : "—";
}

function fmtJuridica(boolVal, valor) {
  if (valor && valor > 0) return fmtPeso(valor);
  return chk(boolVal);
}

export default function ComparativoScreen({
  cotizaciones,
  comparativoIA,
  accionIA,
  asegRenovacion,
  diferenciaPrima,
  esNuevo,
  onSiguiente,
  onVolver,
}) {
  const recomendada = (comparativoIA?.aseguradora_recomendada || "").toUpperCase();
  const ordenadas = ordenarCotizaciones(cotizaciones);

  // ── Banner IA ──
  let bannerClass = "neutral";
  let bannerIcono = "⭐";
  let bannerTitulo = recomendada || "Analizando…";
  let bannerDetalle = "";

  if (accionIA === "CAMBIAR" && !esNuevo) {
    bannerClass = "cambiar";
    bannerIcono = "🔄";
    bannerTitulo = `CAMBIAR → ${recomendada}`;
    const ahorro = diferenciaPrima > 0 ? ` • Ahorro: ${fmtPeso(diferenciaPrima)}/año` : "";
    bannerDetalle = `Mejor opción vs. renovación ${asegRenovacion.toUpperCase()}${ahorro}`;
  } else if (accionIA === "RENOVAR" && !esNuevo) {
    bannerClass = "renovar";
    bannerIcono = "✅";
    bannerTitulo = `RENOVAR con ${recomendada}`;
    bannerDetalle = `La póliza vigente de ${asegRenovacion.toUpperCase()} sigue siendo la mejor opción`;
  } else if (accionIA === "MEJOR_OPCION" || esNuevo) {
    bannerClass = "mejor";
    bannerIcono = "🏆";
    bannerTitulo = `MEJOR OPCIÓN: ${recomendada}`;
    bannerDetalle = "La opción más competitiva para el cliente nuevo";
  }

  // ── Coberturas y deducibles genéricos ──
  const todasCobs = [];
  const todasDeds = [];
  for (const c of ordenadas) {
    for (const cob of c.coberturas || []) {
      if (cob.nombre && !todasCobs.includes(cob.nombre)) todasCobs.push(cob.nombre);
    }
    for (const d of c.deducibles || []) {
      if (d.cobertura && !todasDeds.includes(d.cobertura)) todasDeds.push(d.cobertura);
    }
  }

  // Detectar si hay datos granulares
  const tieneDetalle = ordenadas.some((c) => c.coberturas_detalle);

  // Helper para cell classes
  const cellCls = (c) => {
    const esRenov = c.es_renovacion;
    const esRecom = (c.aseguradora || "").toUpperCase() === recomendada;
    return esRenov ? "td-renov" : esRecom ? "td-recom" : "";
  };

  return (
    <div className="screen-container wide">
      <div className="screen-title">
        <h1>Cuadro Comparativo</h1>
        <p>Análisis completo de todas las cotizaciones con recomendación de IA</p>
      </div>

      {/* Banner Decisión IA */}
      <div className={`banner-decision ${bannerClass}`}>
        <div className="banner-icono">{bannerIcono}</div>
        <div className="banner-body">
          <div className="banner-label">Análisis IA — Adriana recomienda:</div>
          <div className="banner-titulo">{bannerTitulo}</div>
          <div className="banner-detalle">{bannerDetalle}</div>
        </div>
        <div className="banner-justif-wrap">
          <div className="banner-justif-label">Justificación IA:</div>
          <div className="ia-justif">{comparativoIA?.justificacion_corta || "—"}</div>
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="table-wrapper">
        <table className="compare-table">
          <thead>
            <tr>
              <th>ASEGURADORA</th>
              <th>PRIMA NETA</th>
              <th>IVA</th>
              <th>PRIMA TOTAL</th>
              <th>VALOR ASEGURADO</th>
              <th>COBERTURAS DEST.</th>
              <th>DEDUCIBLES</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((c, i) => {
              const esRecom = (c.aseguradora || "").toUpperCase() === recomendada;
              const esRenov = c.es_renovacion;

              const cobDest = (c.coberturas || [])
                .slice(0, 4)
                .map((cob) => (
                  <span key={cob.nombre} className="tag">
                    {abreviarCobertura(cob.nombre)}
                  </span>
                ));
              const dedsDest = (c.deducibles || [])
                .slice(0, 3)
                .map((d) => (
                  <span key={d.cobertura} className="tag">
                    {abreviarCobertura(d.cobertura)}: {d.deducible}
                  </span>
                ));

              return (
                <tr
                  key={`${c.aseguradora}-${c.nombre_plan}-${i}`}
                  className={`${esRecom ? "row-recom" : ""} ${esRenov ? "row-renov" : ""}`}
                >
                  <td>
                    {c.aseguradora || "—"}
                    {c.nombre_plan && <span style={{ fontSize: 11, color: "var(--text2)", display: "block" }}>({c.nombre_plan})</span>}
                    {esRenov && <span className="badge-renov">🔄 VIGENTE</span>}
                    {esRecom && !esRenov && <span className="badge-recom">⭐ RECOMENDADA</span>}
                    {esRecom && esRenov && <span className="badge-recom">⭐ RENOVAR</span>}
                  </td>
                  <td>{fmtPeso(c.prima_neta)}</td>
                  <td>{fmtPeso(c.iva)}</td>
                  <td><span className="prima-total">{fmtPeso(c.prima_total)}</span></td>
                  <td>{fmtPeso(c.valor_asegurado)}</td>
                  <td><div className="tag-list">{cobDest.length > 0 ? cobDest : "—"}</div></td>
                  <td><div className="tag-list">{dedsDest.length > 0 ? dedsDest : "—"}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tabla Granular */}
      <div className="granular-section">
        <div className="granular-titulo">📊 Análisis Detallado por Cobertura (Vista Adriana)</div>
        <div className="table-wrapper">
          <table className="tabla-granular">
            <thead>
              <tr>
                <th className="th-concepto">Concepto</th>
                {ordenadas.map((c, i) => {
                  const esRenov = c.es_renovacion;
                  const esRecom = (c.aseguradora || "").toUpperCase() === recomendada;
                  const cls = esRenov ? "th-renov" : esRecom ? "th-recom" : "";
                  const badge = esRenov ? "🔄" : esRecom ? "⭐" : "";
                  return (
                    <th key={`hd-${i}`} className={cls}>
                      {badge} {(c.aseguradora || "—").toUpperCase()}
                      {c.nombre_plan && <br />}
                      {c.nombre_plan && <span style={{ fontSize: 10, fontWeight: 400 }}>({c.nombre_plan})</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* PRIMA */}
              <tr className="tr-seccion">
                <td colSpan={ordenadas.length + 1}>💰 PRIMA</td>
              </tr>
              {[
                ["Prima Neta", "prima_neta"],
                ["Gastos Expedición", "gastos_expedicion"],
                ["IVA", "iva"],
                ["PRIMA TOTAL ANUAL", "prima_total"],
              ].map(([label, campo], idx) => (
                <tr key={campo} className={idx % 2 === 0 ? "tr-par" : ""}>
                  <td className={`td-concepto${campo === "prima_total" ? " td-bold" : ""}`}>{label}</td>
                  {ordenadas.map((c, j) => (
                    <td key={j} className={`${cellCls(c)}${campo === "prima_total" ? " td-bold" : ""}`}>
                      {fmtPeso(c[campo])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* RCE - Nueva sección granular */}
              {tieneDetalle && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>🛡️ RESPONSABILIDAD CIVIL EXTRACONTRACTUAL (RCE)</td>
                  </tr>
                  <tr className="tr-par">
                    <td className="td-concepto">Límite máximo</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>{fmtPeso(cd(c).rce.limite)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="td-concepto">Deducible</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>
                        {cd(c).rce.sin_deducible
                          ? "SIN DEDUCIBLE"
                          : fmtDeducible(cd(c).rce.deducible_pct, cd(c).rce.deducible_smmlv)}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {/* PÉRDIDA POR DAÑOS */}
              {tieneDetalle && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>💥 PÉRDIDA POR DAÑOS</td>
                  </tr>
                  <tr className="tr-par">
                    <td className="td-concepto">Total - Valor asegurado</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>{fmtPeso(cd(c).perdida_total_danios.valor_asegurado)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="td-concepto">Total - Deducible</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>
                        {fmtDeducible(cd(c).perdida_total_danios.deducible_pct, cd(c).perdida_total_danios.deducible_smmlv)}
                      </td>
                    ))}
                  </tr>
                  <tr className="tr-par">
                    <td className="td-concepto">Parcial - Deducible</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>
                        {fmtDeducible(cd(c).perdida_parcial_danios.deducible_pct, cd(c).perdida_parcial_danios.deducible_smmlv)}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {/* PÉRDIDA POR HURTO */}
              {tieneDetalle && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>🔒 PÉRDIDA POR HURTO</td>
                  </tr>
                  <tr className="tr-par">
                    <td className="td-concepto">Total - Deducible</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>
                        {fmtDeducible(cd(c).perdida_total_hurto.deducible_pct, cd(c).perdida_total_hurto.deducible_smmlv)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="td-concepto">Parcial - Deducible</td>
                    {ordenadas.map((c, j) => (
                      <td key={j} className={cellCls(c)}>
                        {fmtDeducible(cd(c).perdida_parcial_hurto.deducible_pct, cd(c).perdida_parcial_hurto.deducible_smmlv)}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {/* COBERTURAS Y ASISTENCIAS ADICIONALES */}
              {tieneDetalle && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>🏥 COBERTURAS Y ASISTENCIAS ADICIONALES</td>
                  </tr>
                  {[
                    ["Terremoto / Eventos naturales", (c) => chk(cd(c).terremoto)],
                    ["Protección patrimonial", (c) => chk(cd(c).proteccion_patrimonial)],
                    ["Asistencia jurídica penal", (c) => fmtJuridica(cd(c).asistencia_juridica_penal, cd(c).asistencia_juridica_penal_valor)],
                    ["Asistencia jurídica civil", (c) => fmtJuridica(cd(c).asistencia_juridica_civil, cd(c).asistencia_juridica_civil_valor)],
                    ["Lucro cesante", (c) => chk(cd(c).lucro_cesante)],
                    ["Accidentes personales conductor", (c) => fmtPeso(cd(c).accidentes_personales_conductor)],
                    ["Asistencia en viaje", (c) => chk(cd(c).asistencia_en_viaje)],
                    ["Vehículo sustituto", (c) => chk(cd(c).vehiculo_sustituto)],
                    ["Gastos de transporte", (c) => chk(cd(c).gastos_transporte)],
                    ["Cobertura de vidrios", (c) => chk(cd(c).cobertura_vidrios)],
                  ].map(([label, getValue], idx) => (
                    <tr key={label} className={idx % 2 === 0 ? "tr-par" : ""}>
                      <td className="td-concepto">{label}</td>
                      {ordenadas.map((c, j) => (
                        <td key={j} className={cellCls(c)}>{getValue(c)}</td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* AMPAROS genéricos (respaldo) */}
              {todasCobs.length > 0 && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>📋 DETALLE AMPAROS</td>
                  </tr>
                  {todasCobs.map((cob, idx) => (
                    <tr key={cob} className={idx % 2 === 0 ? "tr-par" : ""}>
                      <td className="td-concepto">{cob}</td>
                      {ordenadas.map((c, j) => {
                        const found = (c.coberturas || []).find((x) => x.nombre === cob);
                        const val = found
                          ? isNaN(String(found.valor).replace(/\./g, "").replace(",", "."))
                            ? found.valor
                            : fmtPeso(found.valor)
                          : <span className="td-no">—</span>;
                        return <td key={j} className={cellCls(c)}>{val}</td>;
                      })}
                    </tr>
                  ))}
                </>
              )}

              {/* DEDUCIBLES genéricos (respaldo) */}
              {todasDeds.length > 0 && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>📋 DETALLE DEDUCIBLES</td>
                  </tr>
                  {todasDeds.map((ded, idx) => (
                    <tr key={ded} className={idx % 2 === 0 ? "tr-par" : ""}>
                      <td className="td-concepto">{ded}</td>
                      {ordenadas.map((c, j) => {
                        const found = (c.deducibles || []).find((x) => x.cobertura === ded);
                        const val = found ? found.deducible : <span className="td-no">—</span>;
                        return <td key={j} className={cellCls(c)}>{val}</td>;
                      })}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="action-bar">
        <button className="btn btn-outline" onClick={onVolver}>← Volver</button>
        <button className="btn btn-primary btn-lg" onClick={onSiguiente}>
          Seleccionar Oferta →
        </button>
      </div>
    </div>
  );
}
