import { useState } from "react";

export default function AuthScreen({ db, onAuth }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // "email" | "code"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);

    try {
      if (db) {
        await db.auth.sendMagicCode({ email: email.trim() });
      }
      setStep("code");
    } catch (err) {
      setError(err.message || "Error al enviar el código");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);

    try {
      if (db) {
        await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      }
      // onAuth will be triggered by the useAuth hook in App.jsx
    } catch (err) {
      setError(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  }

  // If no InstantDB configured, skip auth
  if (!db) {
    return (
      <div className="auth-container">
        <img src="/logo.png" alt="ROESAN" className="auth-logo" />
        <div className="auth-card">
          <h2>ROESAN Comparador</h2>
          <p>InstantDB no configurado. Modo sin autenticación.</p>
          <button className="btn btn-primary btn-lg" onClick={() => onAuth({ email: "local@roesan.com.co" })}>
            Entrar sin login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <img src="/logo.png" alt="ROESAN" className="auth-logo" />
      <div className="auth-card">
        <h2>ROESAN Comparador</h2>
        <p>Ingresa con tu correo corporativo para acceder</p>

        {step === "email" ? (
          <form onSubmit={handleSendCode}>
            <input
              type="email"
              className="auth-input"
              placeholder="tucorreo@roesan.com.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              disabled={loading}
            />
            {error && <div className="auth-error">{error}</div>}
            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={!email.trim() || loading}
              style={{ width: "100%" }}
            >
              {loading ? "Enviando…" : "📧 Enviar código de acceso"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <p style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "16px" }}>
              Enviamos un código a <strong>{email}</strong>
            </p>
            <input
              type="text"
              className="auth-input"
              placeholder="Ingresa el código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              disabled={loading}
            />
            {error && <div className="auth-error">{error}</div>}
            <button
              className="btn btn-success btn-lg"
              type="submit"
              disabled={!code.trim() || loading}
              style={{ width: "100%" }}
            >
              {loading ? "Verificando…" : "✅ Verificar código"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              style={{ width: "100%", marginTop: "12px" }}
            >
              ← Cambiar correo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
