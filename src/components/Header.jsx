export default function Header({ pantalla, user, onLogout, onGoToHistory }) {
  const steps = [
    { num: 1, label: "Cargar" },
    { num: 2, label: "Comparativo" },
    { num: 3, label: "Selección" },
    { num: 4, label: "Correo" },
  ];

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "??";

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand" onClick={onGoToHistory} style={{ cursor: "pointer" }}>
          <img src="/logo.png" alt="ROESAN" className="brand-logo-img" />
          {pantalla === 0 && <span className="logo-badge">Dashboard</span>}
        </div>

        {pantalla > 0 ? (
          <div className="step-nav animate-fade-in">
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div className="step-line" />}
                <div
                  className={`step ${s.num === pantalla ? "active" : ""} ${
                    s.num < pantalla ? "done" : ""
                  }`}
                >
                  <span className="step-num">{s.num}</span>
                  <span className="step-label">{s.label}</span>
                </div>
              </div>
            ))}
            <button 
              className="btn btn-sm btn-outline" 
              style={{ marginLeft: "20px", fontSize: "11px" }}
              onClick={onGoToHistory}
            >
              Salir de flujo
            </button>
          </div>
        ) : (
          <div className="main-nav animate-fade-in">
             <button className="btn btn-outline btn-sm active-nav" onClick={onGoToHistory}>
               📦 Historial de Clientes
             </button>
          </div>
        )}

        <div className="header-right">
          {user && (
            <div className="user-badge">
              <div className="user-avatar">{initials}</div>
              <span className="user-email-text">{user.email}</span>
              <button
                className="btn btn-sm btn-danger"
                onClick={onLogout}
                title="Cerrar sesión"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
