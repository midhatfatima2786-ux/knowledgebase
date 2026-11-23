// Frontend-to-n8n communication layer.
const LOCAL_KNOWLEDGE = [
  {
    name: "Employee_Leave_Policy.pdf",
    terms: ["leave", "annual leave", "holiday", "sick leave", "casual leave", "maternity", "paternity", "bereavement"],
    answer: "Full-time employees receive 14 paid annual leave days per completed leave year, accruing at 1.17 days per month. Give 7 calendar days' notice for 1–3 days and 14 days for longer leave. Sick leave is 8 paid days per year, and casual/emergency leave is 8 paid days. Submit planned leave through the HR portal and wait for written approval.\n\nSource: Employee_Leave_Policy.pdf"
  },
  {
    name: "Employee_Attendance_Policy.pdf",
    terms: ["attendance", "working hours", "office hours", "late", "punctual", "overtime", "remote work", "clock"],
    answer: "The standard schedule is Monday–Friday, 9:00 a.m.–5:30 p.m., with a 60-minute lunch break (7.5 working hours per day). Record start and end times in the attendance portal, use remote-work mode when applicable, and notify your manager before a late arrival or absence. Overtime and remote work require prior approval.\n\nSource: Employee_Attendance_Policy.pdf"
  },
  {
    name: "Company_Profile.pdf",
    terms: ["company", "novatech", "profile", "founded", "mission", "vision", "head office", "address", "contact"],
    answer: "NovaTech Solutions (Pvt.) Ltd. is a fictional Pakistan-based IT company headquartered in Lahore. Founded in 2018, it provides software development, cloud setup, IT support and business technology products. The head office is 3rd Floor, Meridian Business Centre, Gulberg III, Lahore. General email: info@novatech.example; phone: +92 42 5550 0100.\n\nSource: Company_Profile.pdf"
  },
  {
    name: "Product_Guide.pdf",
    terms: ["product", "laptop", "pc", "router", "backup", "novabook", "novadesk", "novasecure", "novaconnect", "price", "sku", "catalogue"],
    answer: "Products include: NovaBook Pro 14 (SKU NBP14-2026, sample PKR 245,000), NovaDesk Business PC (NDBPC-2026, PKR 185,000), NovaSecure Backup 1TB (NSB-1TB, PKR 18,000/year), and NovaConnect Wi-Fi 6 Router (NC-R6, PKR 22,500). All prices and specifications are illustrative; the signed quotation or invoice is authoritative.\n\nSource: Product_Guide.pdf"
  },
  {
    name: "Services_Documentation.pdf",
    terms: ["service", "website", "managed it", "cloud migration", "workflow", "automation", "support package"],
    answer: "NovaTech offers website development, managed IT support, cloud migration and workflow automation. Website work starts at a sample PKR 250,000, managed IT packages start at PKR 45,000/month, cloud migration at PKR 180,000 and workflow automation at PKR 120,000. These are demonstration starting fees; third-party costs and final scope are quoted separately.\n\nSource: Services_Documentation.pdf"
  },
  {
    name: "Refund_Policy.pdf",
    terms: ["refund", "return", "exchange", "damaged", "cancel", "replacement", "wrong item", "missing item"],
    answer: "Report incorrect, missing or transit-damaged items within 7 calendar days and faulty items promptly. Email support@novatech.example with the invoice, SKU and reason. Do not send a return until you receive a return authorisation number. Approved product refunds are normally initiated within 7 business days after assessment.\n\nSource: Refund_Policy.pdf"
  },
  {
    name: "Customer_FAQ.pdf",
    terms: ["customer", "support", "contact", "quotation", "delivery", "payment", "warranty", "complaint", "order"],
    answer: "Customer support is available by email at support@novatech.example or by phone at +92 42 5550 0100, Monday–Friday, 9:00 a.m.–5:30 p.m. Submit tickets at www.novatech.example/support. Product quotations should be requested from sales@novatech.example. In-stock products are normally dispatched within 3–5 business days after cleared payment.\n\nSource: Customer_FAQ.pdf"
  },
  {
    name: "Company_Rules.pdf",
    terms: ["rules", "conduct", "harassment", "confidential", "security", "password", "mfa", "property", "gift", "conflict"],
    answer: "Employees must work respectfully, protect confidential information and use company property only for authorised work. Use unique passwords and MFA, never share passwords or codes, lock screens and report security incidents to itsecurity@novatech.example. Concerns can be reported to HR or compliance@novatech.example.\n\nSource: Company_Rules.pdf"
  },
  {
    name: "Communication_Guide.pdf",
    terms: ["communication", "email", "meeting", "phone", "ticket", "escalation", "message", "social media"],
    answer: "Communicate clearly, respectfully and accurately. Internal messages should be acknowledged within one working day, and general customer enquiries within one business day. Security incidents go immediately to itsecurity@novatech.example; unresolved complaints go to the Customer Support Manager; commercial commitments or discounts go to the Sales Manager.\n\nSource: Communication_Guide.pdf"
  },
  {
    name: "Employee_Training_Manual.pdf",
    terms: ["training", "onboarding", "first day", "30 days", "60 days", "90 days", "first week", "induction"],
    answer: "Onboarding includes HR and manager induction, system setup, security review, team meetings and role-specific training. By day 30, complete mandatory induction; by day 60, handle routine tasks with support; by day 90, demonstrate role competence and agree a development plan with the manager.\n\nSource: Employee_Training_Manual.pdf"
  }
];

function getLocalAnswer(question) {
  const text = question.toLowerCase();
  const matches = LOCAL_KNOWLEDGE
    .map(item => ({ ...item, score: item.terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!matches.length) {
    return "I couldn't find this information in the available company knowledge base. Please contact the relevant department for confirmation.";
  }
  return matches[0].answer;
}

async function askKnowledgeBase(question) {
  const url = window.APP_CONFIG?.chatWebhookUrl;
  if (!url) return getLocalAnswer(question);

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    window.APP_CONFIG.requestTimeoutMs || 45000
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ question }),
      signal: controller.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`n8n returned HTTP ${response.status}: ${raw.slice(0, 400)}`);
    }

    let data;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { data = { answer: raw }; }

    if (Array.isArray(data) && data.length) data = data[0].json || data[0];

    const answer =
      data.answer ?? data.response ?? data.output ?? data.text ?? data.message ??
      data.data?.answer ?? data.result?.answer ??
      data.body?.answer ?? data.body?.output;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("n8n responded, but the answer field was empty or unrecognized. Configure Respond to Webhook to return {\"answer\":\"...\"}.");
    }
    return answer.trim();
  } catch (error) {
    // The supplied PDF set is available locally, so it remains usable while n8n is offline.
    if (error instanceof TypeError || error.name === "AbortError" ||
        /HTTP (404|500|502|503)/.test(error.message)) {
      return getLocalAnswer(question);
    }
    if (error.name === "AbortError") throw new Error("The request timed out. Check whether the n8n workflow is active and responding.");
    if (error instanceof TypeError) throw new Error("Could not reach n8n. Check the webhook URL and the workflow's CORS settings.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
