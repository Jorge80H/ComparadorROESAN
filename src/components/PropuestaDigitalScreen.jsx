import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import db from "../lib/instantdb";
import { ShieldCheck, Car, CheckCircle2, AlertCircle, ArrowDown } from "lucide-react";

export default function PropuestaDigitalScreen() {
  const { id } = useParams();
  const { isLoading, error, data } = db.useQuery({
    sesiones: {
      $: {
        where: { id: id }
      }
    }
  });

  const [hasTrackedView, setHasTrackedView] = useState(false);

  const sesion = data?.sesiones?.[0];

  useEffect(() => {
    // Si la sesión existe, no ha sido marcada como vista, y aún no registramos la vista temporalmente en la UI
    if (sesion && !sesion.visto_por_cliente && !hasTrackedView) {
      setHasTrackedView(true);
      db.transact(
        db.tx.sesiones[id].update({
          visto_por_cliente: true,
          fecha_visto: new Date().toISOString()
        })
      );
    }
  }, [sesion, id, hasTrackedView]);

  if (isLoading) {
    return (
      <div className="propuesta-container center-content">
        <div className="spinner"></div>
        <p>Cargando su propuesta personalizada...</p>
      </div>
    );
  }

  if (error || !sesion) {
    return (
      <div className="propuesta-container center-content">
        <AlertCircle size={48} color="#dc2626" />
        <h2>Propuesta no encontrada</h2>
        <p>El enlace que intentas abrir ha expirado o no es válido.</p>
      </div>
    );
  }

  let cotizaciones = [];
  try {
    cotizaciones = JSON.parse(sesion.data_cotizaciones || "[]");
  } catch (e) {}

  const recomendada = sesion.aseguradora_recomendada || "";
  const ganadora = cotizaciones.find(c => c.aseguradora.toUpperCase() === recomendada.toUpperCase());
  const otras = cotizaciones.filter(c => c.aseguradora.toUpperCase() !== recomendada.toUpperCase())
                             .sort((a,b) => formatNum(a.prima_total) - formatNum(b.prima_total));

  return (
    <div className="propuesta-web">
      {/* HEADER HERO */}
      <header className="propuesta-hero">
        <div className="hero-content">
          <img src="/logo-roesan-new.png" alt="ROESAN" className="hero-logo" />
          <h1>Propuesta de Seguro Todo Riesgo</h1>
          <p className="hero-subtitle">Preparada exclusivamente para <br/><strong>{sesion.cliente}</strong></p>
        </div>
      </header>

      <main className="propuesta-main">
        {/* VEHICLE DETAILS */}
        <section className="vehicle-details-card glass-card">
          <Car size={32} className="card-icon" />
          <div className="details-text">
            <h3>{sesion.vehiculo}</h3>
            <p><strong>Placa:</strong> {sesion.placa}</p>
          </div>
        </section>

        {/* RECOMMENDED OFFER */}
        {ganadora && (
          <section className="offer-recommended">
            <div className="recommended-badge">
              <ShieldCheck size={20} />
              NUESTRA RECOMENDACIÓN
            </div>
            <div className="offer-card best-offer">
              <div className="offer-header">
                <h2>{ganadora.aseguradora}</h2>
                <div className="offer-price">
                  <span className="price-label">Prima Total Anual</span>
                  <span className="price-amount">{fmtPeso(ganadora.prima_total)}</span>
                </div>
              </div>
              
              <div className="offer-body">
                 {/* Resumen Amparos Clave */}
                 <div className="coverage-list-simple">
                   {ganadora.coberturas?.slice(0, 5).map((cob, i) => (
                     <div key={i} className="coverage-item">
                       <CheckCircle2 size={16} className="check-icon" />
                       <span>{cob.nombre}</span>
                     </div>
                   ))}
                   <p className="more-coverage">+ Asistencias completas incluidas</p>
                 </div>
              </div>
            </div>
          </section>
        )}

        {/* COMPARATIVE SECTION */}
        {otras.length > 0 && (
          <section className="other-offers">
            <h3 className="section-title">Otras Opciones Analizadas <ArrowDown size={18} /></h3>
            <div className="offers-grid">
              {otras.map((opt, idx) => (
                <div key={idx} className="offer-card regular-offer">
                  <h4>{opt.aseguradora}</h4>
                  <p className="regular-price">{fmtPeso(opt.prima_total)}</p>
                  <span className="option-label">{opt.es_renovacion ? "PÓLIZA ACTUAL" : "Alternativa"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="propuesta-footer">
          <p>Para confirmar esta propuesta, por favor responda al correo enviado por su ejecutiva.</p>
          <div className="roesan-footer-logo">ROESAN SEGUROS</div>
        </footer>
      </main>
    </div>
  );
}

function fmtPeso(val) {
  if (!val) return "—";
  return "$ " + parseInt(val).toLocaleString("es-CO");
}

function formatNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 999999999;
  return parseInt(String(val).replace(/\D/g, "")) || 0;
}
