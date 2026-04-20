/**
 * instantdb.js — Configuración de InstantDB con autenticación
 */
import { init } from "@instantdb/react";

const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID || "";

// Schema para la app ROESAN Comparador
// Entidades:
//   - sesiones: historial de comparaciones
//     { id, fecha, cliente, vehiculo, placa, genero, es_nuevo,
//       cotizaciones (JSON), resultado_ia (JSON), correo, usuario_email }

const db = APP_ID
  ? init({
      appId: APP_ID,
    })
  : null;

export default db;
