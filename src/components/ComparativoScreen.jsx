import { fmtPeso, numPrima, abreviarCobertura, ordenarCotizaciones } from "../lib/helpers";

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

  // ── Tabla granular ──
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
                  {ordenadas.map((c, j) => {
                    const esRenov = c.es_renovacion;
                    const esRecom = (c.aseguradora || "").toUpperCase() === recomendada;
                    const cls = esRenov ? "td-renov" : esRecom ? "td-recom" : "";
                    return (
                      <td key={j} className={`${cls}${campo === "prima_total" ? " td-bold" : ""}`}>
                        {fmtPeso(c[campo])}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* AMPAROS */}
              {todasCobs.length > 0 && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>🛡️ AMPAROS</td>
                  </tr>
                  {todasCobs.map((cob, idx) => (
                    <tr key={cob} className={idx % 2 === 0 ? "tr-par" : ""}>
                      <td className="td-concepto">{cob}</td>
                      {ordenadas.map((c, j) => {
                        const esRenov = c.es_renovacion;
                        const esRecom = (c.aseguradora || "").toUpperCase() === recomendada;
                        const cls = esRenov ? "td-renov" : esRecom ? "td-recom" : "";
                        const found = (c.coberturas || []).find((x) => x.nombre === cob);
                        const val = found
                          ? isNaN(String(found.valor).replace(/\./g, "").replace(",", "."))
                            ? found.valor
                            : fmtPeso(found.valor)
                          : <span className="td-no">—</span>;
                        return <td key={j} className={cls}>{val}</td>;
                      })}
                    </tr>
                  ))}
                </>
              )}

              {/* DEDUCIBLES */}
              {todasDeds.length > 0 && (
                <>
                  <tr className="tr-seccion">
                    <td colSpan={ordenadas.length + 1}>📋 DEDUCIBLES</td>
                  </tr>
                  {todasDeds.map((ded, idx) => (
                    <tr key={ded} className={idx % 2 === 0 ? "tr-par" : ""}>
                      <td className="td-concepto">{ded}</td>
                      {ordenadas.map((c, j) => {
                        const esRenov = c.es_renovacion;
                        const esRecom = (c.aseguradora || "").toUpperCase() === recomendada;
                        const cls = esRenov ? "td-renov" : esRecom ? "td-recom" : "";
                        const found = (c.deducibles || []).find((x) => x.cobertura === ded);
                        const val = found ? found.deducible : <span className="td-no">—</span>;
                        return <td key={j} className={cls}>{val}</td>;
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
