const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearBtn = document.getElementById("clearBtn");
const chatHistory = document.getElementById("chatHistory");
const toast = document.getElementById("toast");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const chatNavBtn = document.getElementById("chatNavBtn");
const documentsNavBtn = document.getElementById("documentsNavBtn");
const chatView = document.getElementById("chatView");
const documentsView = document.getElementById("documentsView");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const historyLabel = document.getElementById("historyLabel");
const refreshDocumentsBtn = document.getElementById("refreshDocumentsBtn");
const refreshDocumentsInlineBtn = document.getElementById("refreshDocumentsInlineBtn");
const documentSearch = document.getElementById("documentSearch");
const documentList = document.getElementById("documentList");
const documentCount = document.getElementById("documentCount");
const documentNavCount = document.getElementById("documentNavCount");
const documentListStatus = document.getElementById("documentListStatus");
const previewTitle = document.getElementById("previewTitle");
const previewEmpty = document.getElementById("previewEmpty");
const pdfPreview = document.getElementById("pdfPreview");
const downloadDocumentBtn = document.getElementById("downloadDocumentBtn");

let chats = [];
let activeChatId = null;
let isSending = false;
let allDocuments = [];

function makeId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}
function currentChat() { return chats.find(chat => chat.id === activeChatId); }

function createChat() {
  const chat = { id: makeId(), title: "New conversation", messages: [] };
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  renderHistory();
  renderMessages();
  input.focus();
  showView("chat");
}
function renderHistory() {
  chatHistory.replaceChildren();
  chats.forEach(chat => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item${chat.id === activeChatId ? " active" : ""}`;
    button.textContent = chat.title;
    button.addEventListener("click", () => {
      activeChatId = chat.id;
      renderHistory();
      renderMessages();
      sidebar.classList.remove("open");
      showView("chat");
    });
    chatHistory.appendChild(button);
  });
}
function addMessage(role, text) {
  const chat = currentChat();
  if (!chat) return;
  chat.messages.push({ role, text, time: new Date() });
  if (role === "user" && chat.messages.filter(m => m.role === "user").length === 1) {
    chat.title = text.length > 28 ? `${text.slice(0, 28)}…` : text;
  }
  renderHistory();
  renderMessages();
  saveChats();
}

function saveChats() {
  sessionStorage.setItem("companyKnowledgeChats", JSON.stringify(chats));
}

function restoreChats() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("companyKnowledgeChats") || "[]");
    if (Array.isArray(stored) && stored.length) {
      chats = stored;
      activeChatId = chats[0].id;
      return true;
    }
  } catch (error) {
    console.warn("Could not restore chat history:", error);
  }
  return false;
}
function renderMessages() {
  messages.replaceChildren();
  const chat = currentChat();
  const hasMessages = Boolean(chat?.messages.length);
  welcome.hidden = hasMessages;
  if (!chat) return;

  chat.messages.forEach(message => {
    const row = document.createElement("div");
    row.className = `message ${message.role}`;
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = message.role === "user" ? "Y" : "K";
    const content = document.createElement("div");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text;
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    content.append(bubble);
    if (message.role === "assistant") {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-answer";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(message.text);
          copyBtn.textContent = "Copied";
          window.setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        } catch {
          showToast("Copy is not available in this browser.");
        }
      });
      content.append(copyBtn);
    }
    content.append(meta);
    row.append(avatar, content);
    messages.appendChild(row);
  });
  messages.scrollTop = messages.scrollHeight;
}
function addTyping() {
  const row = document.createElement("div");
  row.className = "message";
  row.id = "typingIndicator";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "K";
  const bubble = document.createElement("div");
  bubble.className = "bubble typing";
  bubble.textContent = "Searching the company knowledge base…";
  row.append(avatar, bubble);
  messages.appendChild(row);
}
async function submitQuestion(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion || isSending) return;
  if (!currentChat()) createChat();

  addMessage("user", cleanQuestion);
  input.value = "";
  input.style.height = "auto";
  isSending = true;
  sendBtn.disabled = true;
  addTyping();

  try {
    const answer = await askKnowledgeBase(cleanQuestion);
    document.getElementById("typingIndicator")?.remove();
    addMessage("assistant", answer);
  } catch (error) {
    document.getElementById("typingIndicator")?.remove();
    addMessage("assistant", `I couldn't get an answer from the knowledge base.\n\n${error.message}`);
    showToast("Chat connection failed. Check n8n.");
    console.error("Chat request failed:", error);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function showView(view) {
  const showChat = view === "chat";
  chatView.hidden = !showChat;
  documentsView.hidden = showChat;
  chatNavBtn.classList.toggle("active", showChat);
  documentsNavBtn.classList.toggle("active", !showChat);
  historyLabel.hidden = !showChat;
  chatHistory.hidden = !showChat;
  newChatBtn.hidden = !showChat;
  clearBtn.hidden = !showChat;
  refreshDocumentsBtn.hidden = showChat;
  pageTitle.textContent = showChat ? "Company Knowledge Assistant" : "Company Documents";
  pageSubtitle.textContent = showChat ? "● Ready to help" : "Browse your company knowledge library";
  sidebar.classList.remove("open");
  if (!showChat && allDocuments.length === 0) loadDocuments();
}

function renderDocuments(filter = "") {
  documentList.replaceChildren();
  const q = filter.trim().toLowerCase();
  const filtered = allDocuments.filter(doc =>
    (doc.name || "").toLowerCase().includes(q) ||
    (doc.mime_type || "").toLowerCase().includes(q)
  );
  documentCount.textContent = String(allDocuments.length);
  documentNavCount.textContent = String(allDocuments.length);

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.textContent = "▤";
    const title = document.createElement("strong");
    title.textContent = allDocuments.length ? "No matching documents" : "No documents found";
    const detail = document.createElement("small");
    detail.textContent = allDocuments.length ? "Try another search term." : "Check that your List Documents n8n workflow is active and returns document records.";
    empty.append(icon, title, detail);
    documentList.appendChild(empty);
    return;
  }

  filtered.forEach(doc => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "document-card";
    const fileIcon = document.createElement("span");
    fileIcon.className = "file-icon";
    fileIcon.textContent = "PDF";
    const info = document.createElement("span");
    info.className = "document-info";
    const name = document.createElement("strong");
    name.textContent = doc.name;
    const meta = document.createElement("small");
    meta.textContent = doc.mime_type || "Company document";
    info.append(name, meta);
    const arrow = document.createElement("span");
    arrow.className = "document-arrow";
    arrow.textContent = "›";
    button.append(fileIcon, info, arrow);
    button.addEventListener("click", () => openDocument(doc));
    documentList.appendChild(button);
  });
}

async function loadDocuments() {
  documentListStatus.textContent = "Loading…";
  documentList.innerHTML = '<div class="empty-state"><span class="loader"></span><strong>Loading documents</strong><small>Contacting your n8n workflow…</small></div>';
  try {
    allDocuments = await fetchCompanyDocuments();
    if (!allDocuments.length) allDocuments = LOCAL_DOCUMENTS;
    documentListStatus.textContent = `${allDocuments.length} loaded`;
    renderDocuments(documentSearch.value);
  } catch (error) {
    allDocuments = LOCAL_DOCUMENTS;
    documentListStatus.textContent = `${allDocuments.length} available locally`;
    renderDocuments(documentSearch.value);
    console.error("Document list failed:", error);
  }
}
async function openDocument(doc) {
  try {
    const url = await downloadDocument(doc);
    if (!url) throw new Error("No download URL is available.");
    previewTitle.textContent = doc.name;
    previewEmpty.hidden = true;
    pdfPreview.hidden = false;
    pdfPreview.src = url;
    downloadDocumentBtn.href = url;
    downloadDocumentBtn.hidden = false;
  } catch (error) {
    showToast(error.message);
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  submitQuestion(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
newChatBtn.addEventListener("click", createChat);
clearBtn.addEventListener("click", () => {
  if (!currentChat()) return;
  currentChat().messages = [];
  currentChat().title = "New conversation";
  renderHistory();
  renderMessages();
  saveChats();
});
menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => submitQuestion(button.dataset.question || ""));
});
chatNavBtn.addEventListener("click", () => showView("chat"));
documentsNavBtn.addEventListener("click", () => showView("documents"));
refreshDocumentsBtn.addEventListener("click", loadDocuments);
refreshDocumentsInlineBtn.addEventListener("click", loadDocuments);
documentSearch.addEventListener("input", () => renderDocuments(documentSearch.value));

if (!restoreChats()) {
  createChat();
} else {
  renderHistory();
  renderMessages();
  showView("chat");
}
