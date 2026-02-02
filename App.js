/**
 * app.js — Demo interna de validación por QR
 * Sitio: https://legalpridechile-ui.github.io/Certificadovalidar/
 *
 * Código válido DEMO:
 *   94976899
 *
 * Estados:
 *  ✅ Documento original (vigente)
 *  ❌ Documento no válido
 *
 * NOTA: Demo frontend (sin backend). Ideal para presentación comercial.
 */

// ===================== CONFIG =====================
const VERIFY_ENDPOINT = null; // No backend (demo)

// Código único válido para la demo
const DEMO_CODES = {
  "94976899": {
    docName: "Certificado de Autenticidad Documental",
    issuer: "Legal Pride Chile",
    issuedAt: "2026-01-20",
    status: "Vigente",
    owner: "Uso demostrativo interno",
  },
};

const NORMALIZE_TO_UPPERCASE = false;

// ===================== DOM =====================
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

// ===================== UI HELPERS =====================
function setState(state) {
  document.body.classList.remove("state-ok", "state-bad", "state-warn");
  if (state === "ok") document.body.classList.add("state-ok");
  if (state === "bad") document.body.classList.add("state-bad");
  if (state === "warn") document.body.classList.add("state-warn");
}

function setResult({ badge, title, subtitle, icon, top, bottom }) {
  statusBadge.textContent = badge;
  statusTitle.textContent = title;
  statusSubtitle.textContent = subtitle;
  resultIcon.textContent = icon;
  resultTop.textContent = top;
  resultBottom.textContent = bottom;
}

function setMeta({ code, docName, issuer, issuedAt }) {
  metaCode.textContent = code || "—";
  metaDoc.textContent = docName || "—";
  metaIssuer.textContent = issuer || "—";
  metaDate.textContent = issuedAt || "—";
}

// ===================== UTILS =====================
function getCodeFromURL() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("code") || "").trim();
}

function normalizeCode(code) {
  let c = (code || "").trim();
  if (NORMALIZE_TO_UPPERCASE) c = c.toUpperCase();
  return c;
}

// ===================== VERIFY =====================
function verifyWithDemo(code) {
  const hit = DEMO_CODES[code];
  if (!hit) return { valid: false, code };
  return { valid: true, code, ...hit };
}

// ===================== MAIN =====================
function runValidation(rawCode) {
  const code = normalizeCode(rawCode);

  if (!code) {
    setState("warn");
    setResult({
      badge: "Falta el código",
      title: "Escanea el código QR",
      subtitle: "No se detectó un número de validación.",
      icon: "!",
      top: "Estado",
      bottom: "Sin validar",
    });
    setMeta({});
    return;
  }

  const data = verifyWithDemo(code);

  if (!data.valid) {
    setState("bad");
    setResult({
      badge: "Documento no válido",
      title: "❌ Documento no válido",
      subtitle: "El número de validación no existe o no corresponde a un documento original.",
      icon: "×",
      top: "Inválido",
      bottom: code,
    });
    setMeta({ code });
    return;
  }

  // Documento válido
  setState("ok");
  setResult({
    badge: "Documento original",
    title: "✅ Documento original",
    subtitle: "Este documento ha sido validado correctamente mediante código QR.",
    icon: "✓",
    top: "Vigente",
    bottom: code,
  });

  setMeta({
    code,
    docName: data.docName,
    issuer: data.issuer,
    issuedAt: data.issuedAt,
  });
}

// ===================== EVENTS =====================
validateBtn.addEventListener("click", () => runValidation(codeInput.value));
codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runValidation(codeInput.value);
});

// ===================== AUTO VALIDATE (QR) =====================
const urlCode = getCodeFromURL();
if (urlCode) {
  codeInput.value = urlCode;
  runValidation(urlCode);
} else {
  setState("warn");
  setResult({
    badge: "Listo para validar",
    title: "Escanea el QR del documento",
    subtitle: "La validación se realizará automáticamente.",
    icon: "●",
    top: "Estado",
    bottom: "Esperando QR",
  });
  setMeta({});
}
