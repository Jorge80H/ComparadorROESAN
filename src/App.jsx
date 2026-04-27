import React, { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AuthScreen from "./components/AuthScreen";
import UploadScreen from "./components/UploadScreen";
import ComparativoScreen from "./components/ComparativoScreen";
import SeleccionScreen from "./components/SeleccionScreen";
import CorreoScreen from "./components/CorreoScreen";
import HistoryScreen from "./components/HistoryScreen";
import PropuestaDigitalScreen from "./components/PropuestaDigitalScreen";
import { generarCorreo } from "./lib/emailGenerator";
import { normalizarCoberturas, normalizarDeducibles } from "./lib/coverageMapping";
import db from "./lib/instantdb";


// If InstantDB is configured, use a wrapper that calls useAuth unconditionally
function AppWithInstantDB() {
  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="loading-card">
          <div className="spinner" />
          <div className="loading-title">Cargando...</div>
        </div>
      </div>
    );
  }

  return <AppMain dbUser={user} />;
}

// Main export: decides whether to use InstantDB auth or fallback
export default function App() {
  return (
    <Routes>
      <Route path="/propuesta/:id" element={<PropuestaDigitalScreen />} />
      <Route path="*" element={db ? <AppWithInstantDB /> : <AppMain dbUser={null} />} />
    </Routes>
  );
}

function AppMain({ dbUser }) {
  // ── Auth state (fallback when no InstantDB) ──
  const [manualUser, setManualUser] = useState(null);
  const currentUser = dbUser || manualUser;

  // ── App state ──
  const [pantalla, setPantalla] = useState(0); // 0 = Historial/Dashboard
  const [cotizaciones, setCotizaciones] = useState([]);
  const [comparativoIA, setComparativoIA] = useState({});
  const [accionIA, setAccionIA] = useState("");
  const [asegRenovacion, setAsegRenovacion] = useState("");
  const [diferenciaPrima, setDiferenciaPrima] = useState(0);
  const [aseguradoraSeleccionada, setAseguradoraSeleccionada] = useState("");
  const [correoGenerado, setCorreoGenerado] = useState("");
  const [esNuevo, setEsNuevo] = useState(false);
  const [genero, setGenero] = useState("HOMBRE");

  // Loading states
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingCorreo, setLoadingCorreo] = useState(false);

  // ── Auth handlers ──
  function handleAuth(userData) {
    setManualUser(userData);
  }

  function handleLogout() {
    if (db) {
      db.auth.signOut();
    }
    setManualUser(null);
  }

  // ── Process PDFs ──
  const handleProcesar = useCallback(async (archivosBase64, generoParam, esNuevoParam) => {
    setLoadingUpload(true);
    setEsNuevo(esNuevoParam);
    setGenero(generoParam);

    try {
      const todasCotizaciones = [];
      const fallidas = [];

      // Process each PDF one by one
      for (let i = 0; i < archivosBase64.length; i++) {
        const archivo = archivosBase64[i];
        setLoadingMsg(
          `Analizando cotización ${i + 1} de ${archivosBase64.length}: ${archivo.name}...`
        );

        try {
          const res = await fetch("/api/procesar-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pdfBase64: archivo.base64,
              fileName: archivo.name,
              genero: generoParam,
              modeloVehiculo: "", // Will be inferred from PDF
            }),
          });

          const data = await res.json();

          if (data.error) {
            console.warn("Error en PDF:", archivo.name, data.error);

            // Retry on rate limit
            if (data.retry || res.status === 429) {
              setLoadingMsg(`Rate limit... esperando 10s antes de reintentar ${archivo.name}`);
              await new Promise((r) => setTimeout(r, 10000));
              i--; // retry same file
              continue;
            }

            fallidas.push(archivo.name);
          } else if (data.cotizaciones && Array.isArray(data.cotizaciones)) {
            // Normalize coverages client-side
            const normalizadas = data.cotizaciones.map((c) => ({
              ...c,
              es_renovacion: esNuevoParam ? false : archivo.es_renovacion,
              coberturas: normalizarCoberturas(c.coberturas),
              deducibles: normalizarDeducibles(c.deducibles),
            }));
            todasCotizaciones.push(...normalizadas);
          }
        } catch (errPDF) {
          console.warn("Fallo de red:", archivo.name, errPDF);
          fallidas.push(archivo.name);
        }

        // Small pause between PDFs
        if (i < archivosBase64.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (todasCotizaciones.length === 0) {
        setLoadingUpload(false);
        alert("No se pudo extraer información válida de ningún PDF.");
        return;
      }

      // Generate AI comparison
      setLoadingMsg("Generando cuadro comparativo con IA...");
      const resComp = await fetch("/api/comparar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizaciones: todasCotizaciones }),
      });

      const dataComp = await resComp.json();
      setLoadingUpload(false);

      if (dataComp.error) {
        alert("Error en comparación IA: " + dataComp.error);
        return;
      }

      setCotizaciones(todasCotizaciones);
      setComparativoIA(dataComp.comparativo_ia || {});
      setAccionIA(dataComp.accion || "");
      setAsegRenovacion(dataComp.aseguradora_renovacion || "");
      setDiferenciaPrima(dataComp.diferencia_prima || 0);

      if (fallidas.length > 0) {
        console.warn("PDFs que fallaron:", fallidas);
      }

      setPantalla(2);
    } catch (err) {
      setLoadingUpload(false);
      alert("Error general: " + err.message);
    }
  }, []);

  // ── Generate Email ──
  const handleGenerarCorreo = useCallback(
    (asegSeleccionada, justificacion, datosExtra) => {
      setLoadingCorreo(true);
      setAseguradoraSeleccionada(asegSeleccionada);

      const cotSel =
        cotizaciones.find(
          (c) => (c.aseguradora || "").toUpperCase() === asegSeleccionada.toUpperCase()
        ) || cotizaciones[0];

      const correo = generarCorreo({
        cotizacionSeleccionada: cotSel,
        todasCotizaciones: cotizaciones,
        aseguradoraRecomendada: comparativoIA?.aseguradora_recomendada || "",
        justificacionIA: justificacion,
        datosExtra: { ...datosExtra, justificacion_adriana: justificacion },
        accionIA,
        aseguradoraRenovacion: asegRenovacion,
        diferenciaPrima,
        esNuevo,
      });

      setCorreoGenerado(correo);
      setLoadingCorreo(false);
      setPantalla(4);

      // Save to InstantDB if available
      if (db && currentUser) {
        try {
          const id = crypto.randomUUID();
          db.transact(
            db.tx.sesiones[id].update({
              fecha: new Date().toISOString(),
              cliente: cotSel?.tomador || "",
              vehiculo: cotSel?.descripcion_vehiculo || "",
              placa: cotSel?.placa || "",
              genero,
              es_nuevo: esNuevo,
              aseguradora_recomendada: comparativoIA?.aseguradora_recomendada || "",
              aseguradora_seleccionada: asegSeleccionada,
              accion: accionIA,
              prima_total: cotSel?.prima_total || 0,
              usuario_email: currentUser.email || "",
              num_cotizaciones: cotizaciones.length,
              // Guardamos el estado completo para poder reanudar
              data_cotizaciones: JSON.stringify(cotizaciones),
              data_comparativo_ia: JSON.stringify(comparativoIA),
              aseg_renovacion: asegRenovacion,
              diferencia_prima: diferenciaPrima,
              correo_generado: correo,
              enlace_propuesta: window.location.origin + "/propuesta/" + id,
            })
          );
        } catch (err) {
          console.warn("Error guardando en InstantDB:", err);
        }
      }
    },
    [cotizaciones, comparativoIA, accionIA, asegRenovacion, diferenciaPrima, esNuevo, genero, currentUser]
  );

  // ── Resume Session ──
  const handleResumeSession = useCallback((sesion) => {
    try {
      if (sesion.data_cotizaciones) setCotizaciones(JSON.parse(sesion.data_cotizaciones));
      if (sesion.data_comparativo_ia) setComparativoIA(JSON.parse(sesion.data_comparativo_ia));
      setAccionIA(sesion.accion || "");
      setAsegRenovacion(sesion.aseg_renovacion || "");
      setDiferenciaPrima(sesion.diferencia_prima || 0);
      setAseguradoraSeleccionada(sesion.aseguradora_seleccionada || "");
      setCorreoGenerado(sesion.correo_generado || "");
      setEsNuevo(sesion.es_nuevo || false);
      setGenero(sesion.genero || "HOMBRE");
      
      // Si ya tiene correo, vamos a la última pantalla
      if (sesion.correo_generado) {
        setPantalla(4);
      } else {
        setPantalla(2);
      }
    } catch (err) {
      alert("Error al reanudar la sesión: " + err.message);
    }
  }, []);

  // ── New Case ──
  function handleNuevoCaso() {
    setCotizaciones([]);
    setComparativoIA({});
    setAccionIA("");
    setAsegRenovacion("");
    setDiferenciaPrima(0);
    setAseguradoraSeleccionada("");
    setCorreoGenerado("");
    setEsNuevo(false);
    setPantalla(1);
  }

  // ── Auth Gate ──
  if (!currentUser) {
    return <AuthScreen db={db} onAuth={handleAuth} />;
  }

  // ── Main App ──
  return (
    <>
      <Header pantalla={pantalla} user={currentUser} onLogout={handleLogout} onGoToHistory={() => setPantalla(0)} />
      <main className="app-main">
        {pantalla === 0 && (
          <HistoryScreen 
            onNewCase={() => setPantalla(1)} 
            onResumeSession={handleResumeSession} 
          />
        )}
        {pantalla === 1 && (
          <UploadScreen
            onProcesar={handleProcesar}
            loading={loadingUpload}
            loadingMsg={loadingMsg}
          />
        )}
        {pantalla === 2 && (
          <ComparativoScreen
            cotizaciones={cotizaciones}
            comparativoIA={comparativoIA}
            accionIA={accionIA}
            asegRenovacion={asegRenovacion}
            diferenciaPrima={diferenciaPrima}
            esNuevo={esNuevo}
            onSiguiente={() => setPantalla(3)}
            onVolver={() => setPantalla(1)}
          />
        )}
        {pantalla === 3 && (
          <SeleccionScreen
            cotizaciones={cotizaciones}
            comparativoIA={comparativoIA}
            accionIA={accionIA}
            esNuevo={esNuevo}
            onGenerarCorreo={handleGenerarCorreo}
            onVolver={() => setPantalla(2)}
            loading={loadingCorreo}
          />
        )}
        {pantalla === 4 && (
          <CorreoScreen
            correo={correoGenerado}
            cotizaciones={cotizaciones}
            aseguradoraSeleccionada={aseguradoraSeleccionada}
            onNuevoCaso={handleNuevoCaso}
          />
        )}
      </main>
    </>
  );
}
