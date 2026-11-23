// Loads document metadata from the n8n List Documents workflow.
const LOCAL_DOCUMENTS = [
  "Communication_Guide.pdf",
  "Company_Profile.pdf",
  "Company_Rules.pdf",
  "Customer_FAQ.pdf",
  "Employee_Attendance_Policy.pdf",
  "Employee_Leave_Policy.pdf",
  "Employee_Training_Manual.pdf",
  "Product_Guide.pdf",
  "Refund_Policy.pdf",
  "Services_Documentation.pdf"
].map(name => ({
  name,
  mime_type: "application/pdf",
  localPath: `../data/${encodeURIComponent(name)}`
}));

function getDocumentId(doc) {
  return doc.google_drive_file_id || doc.fileId || doc.file_id || doc.id || "";
}
function getDocumentName(doc) {
  return doc.name || doc.file_name || doc.filename || doc.title || "Untitled document";
}
function getStoragePath(doc) {
  return doc.storage_path || doc.path || "";
}
function normalizeDocuments(payload) {
  let value = payload;
  if (Array.isArray(value)) {
    if (value.length === 1 && value[0]?.json) value = value[0].json;
    else return value;
  }
  if (value?.body) value = value.body;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (Array.isArray(value)) return value;
  return value?.documents || value?.files || value?.data || value?.results || [];
}

async function fetchCompanyDocuments() {
  const url = window.APP_CONFIG?.documentsWebhookUrl;
  if (!url) throw new Error("Documents webhook URL is missing in js/config.js.");

  const response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Documents workflow returned HTTP ${response.status}: ${raw.slice(0, 300)}`);

  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error("The documents workflow did not return valid JSON."); }

  return normalizeDocuments(payload).map(doc => ({
    ...doc,
    name: getDocumentName(doc),
    google_drive_file_id: getDocumentId(doc),
    storage_path: getStoragePath(doc)
  }));
}

function makeDownloadUrl(doc) {
  const base = window.APP_CONFIG?.downloadWebhookUrl;
  const fileId = getDocumentId(doc);
  if (!base || !fileId) return "";
  return `${base}?fileId=${encodeURIComponent(fileId)}`;
}

async function downloadDocument(doc) {
  if (doc.localPath) return doc.localPath;
  const url = makeDownloadUrl(doc);
  if (!url) throw new Error("This document does not have a Google Drive file ID. Include google_drive_file_id in the List Documents response.");
  return url;
}
