// ============ CONFIG ============
// Opción A (recomendada): valida contra un backend.
// Ejemplo: https://tu-api.com/verify?code=ABC123
// Debe responder JSON como:
// { "valid": true, "docName": "...", "issuer": "...", "issuedAt": "2026-01-10", "code": "ABC123" }
//
// Si no tienes backend, deja esto en null para usar la demo local.
const VERIFY_ENDPOINT = null; // "https://example.com/verify";

// Opción B (DEMO local): lista de códigos válidos (NO seguro para producción).
// Esto sirve solo para probar la UI.
const DEMO_CODES = {
  "ABC123": { docName: "Certificado de Participación", issuer: "Vibecoding Chile", issuedAt: "2026-01-15" },
  "ZX90K2": { docName: "Constancia de Asistencia", issuer: "Vibecoding Chile", issuedAt: "2026-01-20" },
};

// ============ DOM ============
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
year.textContent = new Date().getFullYear();

// ============ HELPERS ============
function setState(state /* ok|bad|warn|idle */, opts = {}) {
  document.body.classList.remove("state-ok", "state-bad", "state-warn");
  resultBox.classList.remove("pulse");

  if (state === "ok") document.body.classList.add("state-ok");
  if (state === "bad") document.body.classList.add("state-bad");
  if (state === "warn") document.body.classList.add("state-warn");

  if (opts.pulse) resultBox.classList.add("pulse");
}

function setResult({ badge, title, subtitle, icon, top, bottom }) {
  if (badge) statusBadge.textContent = badge;
  if (title) statusTitle.textContent = title;
  if (subtitle) statusSubtitle.textContent = subtitle;

  if (icon) resultIcon.textContent = icon;
  if (top) resultTop.textContent = top;
  if (bottom) resultBottom.textContent = bottom;
}

function setMeta({ code, docName, issuer, issuedAt }) {
  metaCode.textContent = code ?? "—";
  metaDoc.textContent = docName ?? "—";
  metaIssuer.textContent = issuer ?? "—";
  metaDate.textContent = issuedAt ?? "—";
}

function getCodeFromURL() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("code") || "").trim();
}

function normalizeCode(code) {
  return (code || "").trim();
}

async function verifyWithEndpoint(code) {
  const url = new URL(VERIFY_ENDPOINT);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  // Esperamos al menos: { valid: boolean }
  return data;
}

function verifyWithDemo(code) {
  const hit = DEMO_CODES[code];
  if (!hit) return { valid: false, code };
  return { valid: true, code, ...hit };
}

async function verify(code) {
  if (VERIFY_ENDPOINT) return verifyWithEndpoint(code);
  return verifyWithDemo(code);
}

// ============ UI FLOW ============
async function runValidation(rawCode) {
  const code = normalizeCode(rawCode);

  if (!code) {
    setState("warn");
    setResult({
      badge: "Falta el código",
      title: "Ingresa un código o escanea el QR",
      subtitle: "No encontramos el parámetro ?code= en la URL.",
      icon: "!",
      top: "Estado",
      bottom: "Sin validar",
    });
    setMeta({});
    return;
  }

  setState("idle", { pulse: true });
  setResult({
    badge: "Validando…",
    title: "Verificando autenticidad",
    subtitle: "Estamos comprobando el código del documento.",
    icon: "…",
    top: "Procesando",
    bottom: code,
  });
  setMeta({ code });

  try {
    const data = await verify(code);

    if (data.valid) {
      setState("ok");
      setResult({
        badge: "Documento original",
        title: "✅ Documento original",
        subtitle: "La verificación indica que este documento es auténtico.",
        icon: "✓",
        top: "Válido",
        bottom: data.code || code,
      });
      setMeta({
        code: data.code || code,
        docName: data.docName || data.document || "Documento verificado",
        issuer: data.issuer || "—",
        issuedAt: data.issuedAt || data.date || "—",
      });
    } else {
      setState("bad");
      setResult({
        badge: "No válido",
        title: "❌ Documento no válido",
        subtitle: "El código no existe, está revocado o no coincide con un documento original.",
        icon: "×",
        top: "Inválido",
        bottom: data.code || code,
      });
      setMeta({
        code: data.code || code,
        docName: "—",
        issuer: "—",
        issuedAt: "—",
      });
    }
  } catch (err) {
    setState("warn");
    setResult({
      badge: "Error de verificación",
      title: "No se pudo validar",
      subtitle: "Hubo un problema consultando el verificador. Intenta nuevamente.",
      icon: "!",
      top: "Error",
      bottom: code,
    });
  } finally {
    resultBox.classList.remove("pulse");
  }
}

// ============ EVENTS ============
validateBtn.addEventListener("click", () => runValidation(codeInput.value));
codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runValidation(codeInput.value);
});

// Auto-run si viene desde QR con ?code=
const urlCode = getCodeFromURL();
if (urlCode) {
  codeInput.value = urlCode;
  runValidation(urlCode);
} else {
  setState("warn");
  setMeta({});
    }
