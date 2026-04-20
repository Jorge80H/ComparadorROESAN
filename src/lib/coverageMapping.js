/**
 * coverageMapping.js — Diccionario maestro ROESAN para normalizar coberturas
 * Cada aseguradora usa nombres diferentes para las mismas coberturas.
 * Este mapping unifica todos los sinónimos al nombre oficial ROESAN.
 */

export const MAPPING_COBERTURAS = {
  // ── Responsabilidad Civil ──────────────────────────────────
  "rc extracontractual": "Responsabilidad Civil Extracontractual",
  "rce": "Responsabilidad Civil Extracontractual",
  "responsabilidad civil extracontractual": "Responsabilidad Civil Extracontractual",
  "responsabilidad civil": "Responsabilidad Civil Extracontractual",
  "danos a terceros": "Responsabilidad Civil Extracontractual",
  "daños a terceros": "Responsabilidad Civil Extracontractual",
  "rc extracontractual limite unico": "Responsabilidad Civil Extracontractual",
  "responsabilidad civil extracontractual limite unico": "Responsabilidad Civil Extracontractual",

  // ── Pérdidas Totales y Parciales ───────────────────────────
  "perdida total por danos": "Pérdida Total por Daños",
  "perdida total daños": "Pérdida Total por Daños",
  "perdida total por daños": "Pérdida Total por Daños",
  "pt danos": "Pérdida Total por Daños",
  "pt daños": "Pérdida Total por Daños",
  "perdida total danos": "Pérdida Total por Daños",

  "perdida parcial por danos": "Pérdida Parcial por Daños",
  "perdida parcial daños": "Pérdida Parcial por Daños",
  "perdida parcial por daños": "Pérdida Parcial por Daños",
  "pp danos": "Pérdida Parcial por Daños",
  "pp daños": "Pérdida Parcial por Daños",
  "perdida parcial danos": "Pérdida Parcial por Daños",

  "perdida total por hurto": "Pérdida Total por Hurto",
  "perdida total hurto": "Pérdida Total por Hurto",
  "pt hurto": "Pérdida Total por Hurto",

  "perdida parcial por hurto": "Pérdida Parcial por Hurto",
  "perdida parcial hurto": "Pérdida Parcial por Hurto",
  "pp hurto": "Pérdida Parcial por Hurto",

  // ── Eventos de la Naturaleza ──────────────────────────────
  "terremoto y eventos de la naturaleza": "Terremoto y Eventos de la Naturaleza",
  "terremoto": "Terremoto y Eventos de la Naturaleza",
  "amit": "Terremoto y Eventos de la Naturaleza",
  "riesgos de la naturaleza": "Terremoto y Eventos de la Naturaleza",
  "danos por terremoto": "Terremoto y Eventos de la Naturaleza",
  "daños por terremoto": "Terremoto y Eventos de la Naturaleza",
  "eventos de la naturaleza": "Terremoto y Eventos de la Naturaleza",

  // ── Amparo Patrimonial ────────────────────────────────────
  "amparo patrimonial": "Amparo Patrimonial",
  "proteccion patrimonial": "Amparo Patrimonial",

  // ── Asistencia Jurídica ────────────────────────────────────
  "asistencia juridica": "Asistencia Jurídica",
  "asistencia legal": "Asistencia Jurídica",
  "defensa judicial": "Asistencia Jurídica",
  "defensa legal": "Asistencia Jurídica",
  "asistencia juridica en proceso penal": "Asistencia Jurídica",
  "asistencia juridica en proceso civil": "Asistencia Jurídica",
  "defensa penal": "Asistencia Jurídica",

  // ── Asistencia en Viaje ────────────────────────────────────
  "asistencia en viaje": "Asistencia en Viaje",
  "asistencia vehicular": "Asistencia en Viaje",
  "grua": "Asistencia en Viaje",
  "auxilio mecanico": "Asistencia en Viaje",
  "asistencia vial": "Asistencia en Viaje",

  // ── Vehículo Sustituto ─────────────────────────────────────
  "vehiculo maestro o sustituto": "Vehículo Sustituto",
  "vehiculo sustituto": "Vehículo Sustituto",
  "vehiculo de reemplazo": "Vehículo Sustituto",
  "auto de reemplazo": "Vehículo Sustituto",
  "auto sustituto": "Vehículo Sustituto",
  "carro de reemplazo": "Vehículo Sustituto",

  // ── Accidentes Personales ──────────────────────────────────
  "accidentes personales": "Accidentes Personales",
  "ap al conductor": "Accidentes Personales",
  "accidentes conductor": "Accidentes Personales",
  "amparo de accidentes personales": "Accidentes Personales",
  "accidentes personales al conductor": "Accidentes Personales",

  // ── Cobertura de Vidrios ───────────────────────────────────
  "cobertura de vidrios": "Cobertura de Vidrios",
  "rotura de vidrios": "Cobertura de Vidrios",
  "cristales": "Cobertura de Vidrios",
  "estallido de vidrios": "Cobertura de Vidrios",
  "vidrios": "Cobertura de Vidrios",

  // ── Gastos de Transporte / Trámite ─────────────────────────
  "tramite de transito": "Trámite de Tránsito",
  "gastos de transporte": "Gastos de Transporte",
  "gastos de movilizacion": "Gastos de Transporte",
  "gastos de transporte por hurto y danos totales": "Gastos de Transporte",
  "gastos de transporte por hurto y daños totales": "Gastos de Transporte",

  // ── RC Familiar ────────────────────────────────────────────
  "responsabilidad civil general familiar": "Responsabilidad Civil Familiar",
  "rc familiar": "Responsabilidad Civil Familiar",
  "rc cruzada": "Responsabilidad Civil Familiar",
  "responsabilidad civil familiar": "Responsabilidad Civil Familiar",

  // ── Exequias ───────────────────────────────────────────────
  "exequias": "Exequias",
  "auxilio funerario": "Exequias",
  "gastos funerarios": "Exequias",

  // ── Asistencia Odontológica ────────────────────────────────
  "asistencia odontologica": "Asistencia Odontológica",
  "odontologia": "Asistencia Odontológica",
};

/**
 * Normaliza un nombre de cobertura usando el diccionario maestro.
 * Retorna el nombre oficial ROESAN, o null si no se reconoce.
 */
export function homologarNombre(nombreOriginal) {
  if (!nombreOriginal) return null;

  const simplificar = (texto) =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const nSimple = simplificar(nombreOriginal);

  for (const [clave, oficial] of Object.entries(MAPPING_COBERTURAS)) {
    if (clave === nSimple || nSimple.includes(clave) || clave.includes(nSimple)) {
      return oficial;
    }
  }

  return null;
}

/**
 * Normaliza las coberturas de una cotización, eliminando duplicados.
 */
export function normalizarCoberturas(coberturas) {
  if (!Array.isArray(coberturas)) return [];
  const vistos = new Set();
  const resultado = [];

  for (const cob of coberturas) {
    const nombre = cob?.nombre || cob?.name || "";
    const valor = cob?.valor || cob?.value || "INCLUIDA";
    if (!nombre) continue;

    const homologado = homologarNombre(nombre);
    if (homologado && !vistos.has(homologado)) {
      vistos.add(homologado);
      resultado.push({ nombre: homologado, valor: String(valor) });
    }
  }
  return resultado;
}

/**
 * Normaliza los deducibles de una cotización, eliminando duplicados.
 */
export function normalizarDeducibles(deducibles) {
  if (!Array.isArray(deducibles)) return [];
  const vistos = new Set();
  const resultado = [];

  for (const ded of deducibles) {
    const cobertura = ded?.cobertura || ded?.coverage || "";
    const deducible = ded?.deducible || ded?.value || "";
    if (!cobertura) continue;

    const homologado = homologarNombre(cobertura);
    if (homologado && !vistos.has(homologado)) {
      vistos.add(homologado);
      resultado.push({ cobertura: homologado, deducible: String(deducible) });
    }
  }
  return resultado;
}
