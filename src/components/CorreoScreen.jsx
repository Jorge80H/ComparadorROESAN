import { useState } from "react";

export default function CorreoScreen({ correo, cotizaciones, aseguradoraSeleccionada, onNuevoCaso }) {
  const [showToast, setShowToast] = useState(false);

  function copiarCorreo() {
    navigator.clipboard.writeText(correo).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    });
  }

  async function descargarExcel() {
    const cot = cotizaciones.find(
      (c) => (c.aseguradora || "").toUpperCase() === aseguradoraSeleccionada.toUpperCase()
    ) || cotizaciones[0] || {};
    const nombreCliente = cot.tomador || "CLIENTE";

    try {
      const res = await fetch("/api/generar-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotizaciones,
          aseguradora_seleccionada: aseguradoraSeleccionada,
          nombre_cliente: nombreCliente,
        }),
      });

      if (!res.ok) {
        alert("Error al generar el Excel");
        return;
      }

      const data = await res.json();
      if (data.error) {
        alert("Error: " + data.error);
        return;
      }

      // Convert base64 to blob and download
      const byteCharacters = atob(data.excel_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `COMPARATIVO_${nombreCliente.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error al descargar Excel: " + err.message);
    }
  }

  async function sincronizarCRM() {
    alert("Sincronización con CRM en desarrollo. El agente del CRM está preparando el endpoint receptor.");
    console.log("Datos para el CRM:", {
      cliente: cotizaciones[0]?.tomador,
      placa: cotizaciones[0]?.placa,
      aseguradora_seleccionada: aseguradoraSeleccionada,
      prima_total: cotizaciones.find(c => c.aseguradora === aseguradoraSeleccionada)?.prima_total
    });
  }

  return (
    <div className="screen-container wide">
      <div className="screen-title">
        <h1>Correo Generado</h1>
        <p>Listo para copiar y enviar al cliente desde tu correo</p>
      </div>

      <div className="email-actions">
        <button className="btn btn-primary" onClick={copiarCorreo}>
          <span className="btn-icon">📋</span> Copiar todo
        </button>
        <button className="btn btn-outline" onClick={descargarExcel}>
          <span className="btn-icon">📊</span> Descargar Excel Comparativo
        </button>
        <button className="btn btn-success" onClick={sincronizarCRM}>
          <span className="btn-icon">🔄</span> Sincronizar con CRM
        </button>
        <button className="btn btn-outline" onClick={onNuevoCaso}>
          <span className="btn-icon">✨</span> Nuevo caso
        </button>
      </div>

      <div className="email-container">
        <pre className="email-body">{correo}</pre>
      </div>

      <div className={`toast ${showToast ? "show" : ""}`}>
        ✅ ¡Correo copiado al portapapeles!
      </div>
    </div>
  );
}
