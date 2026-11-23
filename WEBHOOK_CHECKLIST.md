# n8n Webhook Checklist

## Chat
- Production webhook URL: `https://n8n.thinkcode.it/webhook/company-knowledge-chatbot`
- Workflow is active.
- Webhook accepts POST JSON with a `question` property.
- Respond to Webhook returns JSON with a non-empty `answer` property.
- CORS allows the frontend origin.

## List documents
- Production URL: `https://n8n.thinkcode.it/webhook/company-documents`
- Workflow is active.
- Supabase query reads from `company_files`.
- Response includes a `documents` array.
- Each document includes `name` and `google_drive_file_id`.
- CORS allows the frontend origin.

## Download
- Production URL: `https://n8n.thinkcode.it/webhook/company-documents-download`
- Workflow is active.
- It accepts `?fileId=INDIVIDUAL_DRIVE_FILE_ID`.
- It validates that the requester may access the file.
- It returns PDF binary, not JSON.
- Response content type is `application/pdf`.
- CORS allows the frontend origin.

## Common browser errors
- `Failed to fetch`: check workflow active state, URL, TLS, and CORS.
- `404`: check webhook path and production workflow activation.
- `500`: inspect the n8n execution for the failing node.
- `no answer field`: fix the chat workflow's Respond to Webhook output.
- `No documents found`: check Supabase `company_files` rows and list workflow output.
