import { useState } from "react";
import db from "../lib/instantdb";
import { fmtPeso } from "../lib/helpers";

export default function HistoryScreen({ onResumeSession, onNewCase }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // InstantDB query to get all sessions
  const { isLoading, error, data } = db 
    ? db.useQuery({ sesiones: {} }) 
    : { isLoading: false, error: null, data: { sesiones: [] } };

  if (isLoading) {
    return (
      <div className="screen-container">
        <div className="loading-card" style={{ background: "transparent", border: "none" }}>
          <div className="spinner" />
          <p>Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen-container">
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <p style={{ color: "var(--danger)" }}>Error cargando historial: {error.message}</p>
        </div>
      </div>
    );
  }

  const sesiones = (data?.sesiones || [])
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .filter(s => 
      (s.cliente || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.placa || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="screen-container wide animate-fade-in">
      <div className="screen-title" style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>Panel de Control</h1>
          <p>Gestiona las cotizaciones y renovaciones de tus clientes</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onNewCase}>
          <span className="btn-icon">＋</span> Nueva Cotización
        </button>
      </div>

      <div className="card" style={{ marginBottom: "24px", padding: "12px 16px" }}>
        <input 
          type="text" 
          className="auth-input" 
          placeholder="🔍 Buscar por nombre de cliente o placa..." 
          style={{ marginBottom: 0 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {sesiones.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px opacity: 0.5" }}>📁</div>
          <p style={{ color: "var(--text2)" }}>No se encontraron sesiones previas.</p>
          {searchTerm && <button className="btn btn-outline btn-sm" style={{ marginTop: "12px" }} onClick={() => setSearchTerm("")}>Limpiar búsqueda</button>}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>CLIENTE</th>
                <th>VEHÍCULO / PLACA</th>
                <th>ASEG. SELECCIONADA</th>
                <th>PRIMA TOTAL</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {new Date(s.fecha).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.cliente || "—"}</td>
                  <td>
                    <span style={{ display: "block", fontSize: "13px" }}>{s.vehiculo || "—"}</span>
                    <span className="tag" style={{ marginTop: "4px", display: "inline-block" }}>{s.placa || "???"}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--primary)" }}>{s.aseguradora_seleccionada || "—"}</span>
                    {s.accion === "RENOVAR" && <span className="badge-renov" style={{ fontSize: "9px" }}>RENOVACIÓN</span>}
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmtPeso(s.prima_total)}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => onResumeSession(s)}
                      title="Ver detalles y retomar"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Callout similar al CRM */}
      <div className="hint-card" style={{ marginTop: "40px", background: "rgba(50, 189, 232, 0.05)", borderColor: "rgba(50, 189, 232, 0.2)" }}>
          <div className="hint-icon" style={{ color: "var(--primary)" }}>ℹ️</div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text)" }}>Conexión con Softseguros</p>
            <p style={{ fontSize: "12px", marginTop: "4px" }}>
              Próximamente podrás sincronizar estos clientes directamente con tu CRM. Los datos se guardan de forma segura en InstantDB.
            </p>
          </div>
      </div>
    </div>
  );
}
