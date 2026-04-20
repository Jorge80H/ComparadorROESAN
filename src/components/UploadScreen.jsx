import { useState, useRef } from "react";
import { esRenovacion, fileToBase64 } from "../lib/helpers";

const MAX_FILES = 13;

export default function UploadScreen({ onProcesar, loading, loadingMsg }) {
  const [archivos, setArchivos] = useState([]);
  const [genero, setGenero] = useState("HOMBRE");
  const [esNuevo, setEsNuevo] = useState(false);
  const fileInputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    agregarArchivos(Array.from(e.dataTransfer.files));
  }

  function agregarArchivos(nuevos) {
    const pdfs = nuevos.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setArchivos((prev) => {
      const nombres = new Set(prev.map((f) => f.name));
      const todos = [...prev];
      for (const f of pdfs) {
        if (!nombres.has(f.name) && todos.length < MAX_FILES) {
          todos.push(f);
          nombres.add(f.name);
        }
      }
      return todos;
    });
  }

  function quitarArchivo(index) {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleProcesar() {
    if (archivos.length === 0) return;

    // Convertir archivos a base64 antes de enviar
    const archivosBase64 = [];
    for (const f of archivos) {
      const base64 = await fileToBase64(f);
      archivosBase64.push({
        name: f.name,
        size: f.size,
        base64,
        es_renovacion: esRenovacion(f.name),
      });
    }

    onProcesar(archivosBase64, genero, esNuevo);
  }

  return (
    <div className="screen-container">
      <div className="screen-title">
        <h1>Carga de Cotizaciones</h1>
        <p>Sube los PDFs de cotizaciones y el sistema los procesará con IA</p>
      </div>

      {/* Upload Zone */}
      <div
        className="upload-zone"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
        onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📄</div>
        <div className="upload-text">
          <strong>Arrastra los PDFs aquí</strong>
          <span>o haz clic para seleccionar archivos</span>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf"
          hidden
          onChange={(e) => {
            agregarArchivos(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <button
          className="btn btn-outline"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          Seleccionar PDFs
        </button>
      </div>

      {/* File List */}
      {archivos.length > 0 && (
        <div className="file-list">
          {archivos.map((f, i) => {
            const esRenov = esRenovacion(f.name);
            return (
              <div className="file-item" key={f.name}>
                <span className="file-icon">{esRenov ? "🔄" : "📄"}</span>
                <span className="file-name">
                  {f.name}
                  {esRenov && <span className="badge-renov">RENOVACIÓN</span>}
                </span>
                <span className="file-size">{(f.size / 1024).toFixed(0)} KB</span>
                <button className="file-remove" onClick={() => quitarArchivo(i)} title="Quitar">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Options */}
      <div className="options-grid">
        <div className="option-group">
          <label>Género del asegurado</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option value="HOMBRE">Hombre</option>
            <option value="MUJER">Mujer</option>
          </select>
        </div>
      </div>

      <div className="checkbox-row">
        <input
          type="checkbox"
          id="esNuevo"
          checked={esNuevo}
          onChange={(e) => setEsNuevo(e.target.checked)}
        />
        <label htmlFor="esNuevo">
          Es cotización nueva (cliente sin póliza vigente, no hay renovación)
        </label>
      </div>

      {/* Hint */}
      <div className="hint-card">
        <span className="hint-icon">💡</span>
        <div>
          <strong>Tip:</strong> Puedes subir hasta <strong>{MAX_FILES} cotizaciones</strong> PDF.
          El archivo de <strong>RENOVACIÓN</strong> se detecta automáticamente si contiene
          la palabra <em>RENOVACION</em> o <em>RECIBO</em> en su nombre. 🔄
        </div>
      </div>

      {/* Action */}
      <div className="action-bar">
        <button
          className="btn btn-primary btn-lg"
          disabled={archivos.length === 0 || loading}
          onClick={handleProcesar}
        >
          <span className="btn-icon">⚡</span> Procesar con IA
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <div className="loading-title">Procesando cotizaciones…</div>
            <div className="loading-sub">{loadingMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
