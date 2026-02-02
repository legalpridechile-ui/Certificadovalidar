/**
 * app.js — Demo interna (sin backend)
 * - Valida un código proveniente de un QR en la URL: ?code=XXXX
 * - Muestra 3 estados comerciales:
 *    ✅ Documento original (Vigente)
 *    ⚠️ Documento revocado
 *    ❌ Código no encontrado / no válido
 *
 * Requisitos: este JS está pensado para el index.html que te pasé antes
 * (con los IDs: statusBadge, statusTitle, statusSubtitle, codeInput, validateBtn,
 *  resultBox, resultIcon, resultTop, resultBottom, metaCode, metaDoc, metaIssuer, metaDate, year)
 */

// ===================== CONFIG =====================
// Si más adelante quieres conectar un backend, define la URL aquí:
// Ej: const VERIFY_ENDPOINT = "https://tu-api.com/verify";
const VERIFY_ENDPOINT = null;

// DEMO local: códigos válidos/revocados (editable).
// Tip: crea 5–15 códigos para una demo creíble.
const DEMO_CODES = {
  "VBC-9F3K7Q": {
    docName: "Certificado de Capacitación",
    issuer: "Vibecoding Chile",
    issuedAt: "2026-01-15",
    status: "Vigente",
    owner: "Empresa Demo SpA",
  },
  "VBC-2M8P1A": {
    docName: "Contrato de Prestación de Servicios",
    issuer: "Vibecoding Chile",
    issuedAt: "2026-01-20",
    status: "Vigente",
    owner: "Cliente Ejemplo Ltda",
  },
  "VBC-REVOK1": {
    docName: "Certificado de Participación",
    issuer: "Vibecoding Chile",
    issuedAt: "2026-01-10",
    status: "Revocado",
    owner: "Organización X",
    reason: "Documento reemplazado por una nueva versión",
  },
};

// Normalización (opcional): forzar mayúsculas y quitar espacios
const NORMALIZE_TO_UPPERCASE = true;

// ===================== DOM HELPERS =====================
const $ = (id) => document.getElementById(id);

const statusBadge = $("statusBadge");
const statusTitle = $("statusTitle");
const statusSubtitle = $("statusSubtitle");

const codeInput = $("codeInput");
const validateBtn = $("validateBtn");

const resultBox = $("resultBox");
const resultIcon = $("resultIcon");
const resultTop = $("resultTop");
const resultBottom = $("resultBottom");

const metaCode = $("metaCode");
const metaDoc = $("metaDoc");
const metaIssuer = $("metaIssuer");
const metaDate = $("metaDate");

const year = $("year");
if (year) year.textContent = new Date().getFullYear();

// ===================== UI STATE =====================
function setBodyState(state /* ok|bad|warn|idle */, opts = {}) {
  document.body.classList.remove("state-ok", "state-bad", "state-warn");
  resultBox?.classList.remove("pulse");

  if (state === "ok") document.body.classList.add("state-ok");
  if (state === "bad") document.body.classList.add("state-bad");
  if (state === "warn") document.body.classList.add("state-warn");

  if (opts.pulse) resultBox?.classList.add("pulse");
}

function setResultUI({ badge, title, subtitle, icon, top, bottom }) {
  if (statusBadge && badge != null) statusBadge.textContent = badge;
  if (statusTitle && title != null) statusTitle.textContent = title;
  if (statusSubtitle && subtitle != null) statusSubtitle.textContent = subtitle;

  if (resultIcon && icon != null) resultIcon.textContent = icon;
  if (resultTop && top != null) resultTop.textContent = top;
  if (resultBottom && bottom != null) resultBottom.textContent = bottom;
}

function setMetaUI({ code, docName, issuer, issuedAt }) {
  if (metaCode) metaCode.textContent = code ?? "—";
  if (metaDoc) metaDoc.textContent = docName ?? "—";
  if (metaIssuer) metaIssuer.textContent = issuer ?? "—";
  if (metaDate) metaDate.textContent = issuedAt ?? "—";
}

// ===================== URL / CODE =====================
function getCodeFromURL() {
  try {
    const url = new URL(window.location.href);
    return (url.searchParams.get("code") || "").trim();
  } catch {
    return "";
  }
}

function normalizeCode(code) {
  let c = (code || "").trim();
  if (NORMALIZE_TO_UPPERCASE) c = c.toUpperCase();
  return c;
}

function setURLCode(code) {
  // actualiza la URL sin recargar (para que quede “bonito” si validan manualmente)
  try {
    const url = new URL(window.location.href);
    if (code) url.searchParams.set("code", code);
    else url.searchParams.delete("code");
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

// ===================== VERIFY =====================
async function verifyWithEndpoint(code) {
  // Espera JSON tipo:
  // { valid: true|false, status: "Vigente"|"Revocado", docName, issuer, issuedAt, code }
  const url = new URL(VERIFY_ENDPOINT);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function verifyWithDemo(code) {
  const hit = DEMO_CODES[code];
  if (!hit) return { valid: false, code };

  // Si está Revocado, lo tratamos como caso especial.
  if ((hit.status || "").toLowerCase() === "revocado") {
    return { valid: true, code, ...hit, _revoked: true };
  }

  return { valid: true, code, ...hit, _revoked: false };
}

async function verify(code) {
  if (VERIFY_ENDPOINT) return verifyWithEndpoint(code);
  return verifyWithDemo(code);
}

// ===================== MAIN FLOW =====================
async function runValidation(rawCode) {
  const code = normalizeCode(rawCode);

  if (!code) {
    setBodyState("warn");
    setResultUI({
      badge: "Falta el código",
      title: "Ingresa un código o escanea el QR",
      subtitle: "No encontramos el parámetro ?code= en la URL.",
      icon: "!",
      top: "Estado",
      bottom: "Sin validar",
    });
    setMetaUI({});
    setURLCode("");
    return;
  }

  // Guardar en URL
  setURLCode(code);

  // Loading
  setBodyState("idle", { pulse: true });
  setResultUI({
    badge: "Validando…",
    title: "Verificando autenticidad",
    subtitle: "Comprobando el código del documento.",
    icon: "…",
    top: "Procesando",
    bottom: code,
  });
  setMetaUI({ code });

  try {
    const data = await verify(code);

    // Caso: no existe
    if (!data || data.valid !== true) {
      setBodyState("bad");
      setResultUI({
        badge: "No válido",
        title: "❌ Documento no válido",
        subtitle: "El código no existe o no coincide con un documento original.",
        icon: "×",
        top: "Inválido",
        bottom: code,
      });
      setMetaUI({ code, docName: "—", issuer: "—", issuedAt: "—" });
      return;
    }

    // Caso: revocado
    if (data._revoked || (data.status || "").toLowerCase() === "revocado") {
      setBodyState("warn");
      setResultUI({
        badge: "Documento revocado",
        title: "⚠️ Documento revocado",
        subtitle:
          data.reason
            ? `Este documento fue revocado. Motivo: ${data.reason}`
            : "Este documento fue revocado y no debe considerarse válido.",
        icon: "!",
        top: "Revocado",
        bottom: code,
      });
      setMetaUI({
        code,
        docName: data.docName || "Documento verificado",
        issuer: data.issuer || "—",
        issuedAt: data.issuedAt || "—",
      });
      return;
    }

    // Caso: válido vigente
    setBodyState("ok");
    setResultUI({
      badge: "Documento original",
      title: "✅ Documento original",
      subtitle: "La verificación indica que este documento es auténtico (demo).",
      icon: "✓",
      top: "Vigente",
      bottom: code,
    });

    setMetaUI({
      code,
      docName: data.docName || "Documento verificado",
      issuer: data.issuer || "—",
      issuedAt: data.issuedAt || "—",
    });
  } catch (err) {
    setBodyState("warn");
    setResultUI({
      badge: "Error de verificación",
      title: "No se pudo validar",
      subtitle: "Hubo un problema al validar el código. Intenta nuevamente.",
      icon: "!",
      top: "Error",
      bottom: code,
    });
    setMetaUI({ code });
  } finally {
    resultBox?.classList.remove("pulse");
  }
}

// ===================== EVENTS =====================
if (validateBtn) {
  validateBtn.addEventListener("click", () => runValidation(codeInput?.value || ""));
}

if (codeInput) {
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runValidation(codeInput.value);
  });
}

// Auto-run si viene desde QR con ?code=
const urlCode = getCodeFromURL();
if (codeInput && urlCode) codeInput.value = normalizeCode(urlCode);

if (urlCode) {
  runValidation(urlCode);
} else {
  // estado inicial bonito
  setBodyState("warn");
  setResultUI({
    badge: "Listo para validar",
    title: "Escanea el QR para validar",
    subtitle: "Si el QR incluye ?code=, la validación se hará automáticamente.",
    icon: "●",
    top: "Estado",
    bottom: "Sin validar",
  });
  setMetaUI({});
    }
