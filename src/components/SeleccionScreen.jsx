import { useState } from "react";
import { fmtPeso, ordenarCotizaciones } from "../lib/helpers";

export default function SeleccionScreen({
  cotizaciones,
  comparativoIA,
  accionIA,
  esNuevo,
  onGenerarCorreo,
  onVolver,
  loading,
}) {
  const recomendada = (comparativoIA?.aseguradora_recomendada || "").toUpperCase();
  const ordenadas = ordenarCotizaciones(cotizaciones);

  const [seleccionada, setSeleccionada] = useState(recomendada);
  const [justificacion, setJustificacion] = useState(comparativoIA?.justificacion_corta || "");
  const [datosExtra, setDatosExtra] = useState({
    valor_soat: "",
    codigo_faseolda: "",
    vigencia_soat: "",
    zona_circulacion: "",
  });

  function handleGenerar() {
    if (!seleccionada) {
      alert("Selecciona una aseguradora antes de generar el correo.");
      return;
    }
    onGenerarCorreo(seleccionada, justificacion, datosExtra);
  }

  return (
    <div className="screen-container">
      <div className="screen-title">
        <h1>Confirmación de Oferta</h1>
        <p>Elige la aseguradora para el correo al cliente y ajusta el mensaje</p>
      </div>

      {/* Selection Grid */}
      <div className="selection-grid">
        {ordenadas.map((c, i) => {
          const nombre = (c.aseguradora || "").toUpperCase();
          const esRecom = nombre === recomendada;
          const esRenov = c.es_renovacion;
          const esSel = nombre === seleccionada;

          let badgeText = null;
          if (esRecom && accionIA === "RENOVAR") badgeText = "✅ IA: RENOVAR";
          else if (esRecom && accionIA === "CAMBIAR") badgeText = "⭐ IA: CAMBIAR A ESTA";
          else if (esRecom && (accionIA === "MEJOR_OPCION" || esNuevo)) badgeText = "🏆 IA: MEJOR OPCIÓN";

          return (
            <div
              key={`${c.aseguradora}-${c.nombre_plan}-${i}`}
              className={`sel-card ${esRecom ? "sel-recom" : ""} ${esSel ? "selected" : ""}`}
              onClick={() => setSeleccionada(nombre)}
            >
              <div className="sel-aseg">{c.aseguradora || "—"}</div>
              {c.nombre_plan && <div className="sel-plan">{c.nombre_plan}</div>}
              <div className="sel-prima">{fmtPeso(c.prima_total)}</div>
              {esRenov && <div className="sel-renov-badge">🔄 PÓLIZA VIGENTE</div>}
              {badgeText && <div className="sel-recom-badge">{badgeText}</div>}
            </div>
          );
        })}
      </div>

      {/* Justificación editable */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-label">✏️ Texto de recomendación (editable)</div>
        <textarea
          className="justif-textarea"
          rows={3}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder="Ej: Revisando con las demás compañías recomendamos continuar con HDI, por cobertura y valor de prima."
        />
        <div className="field-hint">Este texto irá en el cuerpo del correo al cliente.</div>
      </div>

      {/* Datos adicionales */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-label">📋 Datos adicionales del cliente (opcional)</div>
        <div className="fields-grid">
          <div className="field-group">
            <label>Valor SOAT</label>
            <input
              type="text"
              placeholder="Ej: 677.400"
              value={datosExtra.valor_soat}
              onChange={(e) => setDatosExtra({ ...datosExtra, valor_soat: e.target.value })}
            />
          </div>
          <div className="field-group">
            <label>Código Faseolda</label>
            <input
              type="text"
              placeholder="Ej: 1601232"
              value={datosExtra.codigo_faseolda}
              onChange={(e) => setDatosExtra({ ...datosExtra, codigo_faseolda: e.target.value })}
            />
          </div>
          <div className="field-group">
            <label>Vigencia SOAT</label>
            <input
              type="text"
              placeholder="Ej: 12/03/2026"
              value={datosExtra.vigencia_soat}
              onChange={(e) => setDatosExtra({ ...datosExtra, vigencia_soat: e.target.value })}
            />
          </div>
          <div className="field-group">
            <label>Zona Circulación</label>
            <input
              type="text"
              placeholder="Ej: BOGOTÁ"
              value={datosExtra.zona_circulacion}
              onChange={(e) => setDatosExtra({ ...datosExtra, zona_circulacion: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="action-bar">
        <button className="btn btn-outline" onClick={onVolver}>← Volver</button>
        <button
          className="btn btn-success btn-lg"
          onClick={handleGenerar}
          disabled={loading}
        >
          <span className="btn-icon">✉️</span> Generar Correo
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <div className="loading-title">Generando correo…</div>
          </div>
        </div>
      )}
    </div>
  );
}
