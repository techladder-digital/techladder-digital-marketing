# Enabling automatic WhatsApp notifications

The website always works without WhatsApp. When configured, every new enquiry triggers a WhatsApp **template message** to your business number through Meta's official **WhatsApp Business Platform (Cloud API)**. Visitors can also always use the “WhatsApp Us” button (a `wa.me` link) — that needs only the WhatsApp number in *Website settings*.

> Meta's console layout, API versions and pricing change over time. Treat the steps below as a guide and confirm details in Meta's current documentation (developers.facebook.com/docs/whatsapp/cloud-api). Business-initiated template messages may be charged by Meta.

## What you need

1. A **Meta Business** account (business.facebook.com), ideally verified.
2. A **Meta developer app** of type *Business* with the **WhatsApp** product added.
3. A **sender phone number** registered on the WhatsApp Business Platform. It cannot simultaneously be used in the regular WhatsApp / WhatsApp Business mobile app.
4. A **recipient number** — the phone that should receive enquiry alerts (e.g. the owner's WhatsApp). While the app is in development/test mode, Meta only delivers to numbers added to the app's allowed recipient list.

## Steps

1. **Phone number ID** — WhatsApp → API Setup shows the *Phone number ID* (not the phone number itself). Put it in `WHATSAPP_PHONE_NUMBER_ID`.
2. **Access token** — the temporary token shown in API Setup expires within a day. For production create a **System User** in Business Settings, assign the app and WhatsApp account, and generate a token with `whatsapp_business_messaging` (and `whatsapp_business_management`) permissions. Put it in `WHATSAPP_ACCESS_TOKEN`. Never place it in the frontend or source control.
3. **Message template** — WhatsApp Manager → Message templates → Create. Category: **Utility**. Name: `new_enquiry_alert` (or set `WHATSAPP_TEMPLATE_NAME`). Language: English (`en`; set `WHATSAPP_TEMPLATE_LANGUAGE` to match exactly, e.g. `en_US`). Body with **exactly five variables** in this order:

   ```
   New website enquiry #{{1}} from {{2}} about {{3}}. Phone: {{4}}. Preferred contact: {{5}}. Please check the admin panel for details.
   ```

   Wait until the template status is **Approved**. The customer's message text is deliberately *not* sent over WhatsApp — read it in the admin panel.
4. **Recipient** — `WHATSAPP_BUSINESS_RECIPIENT` in international format, digits only (e.g. `919876543210`).
5. **API version** — `WHATSAPP_API_VERSION` (default `v21.0`). Update it to a currently supported Graph API version when Meta deprecates older ones.
6. **Webhook (delivery status)** — App → WhatsApp → Configuration → Webhook:
   - Callback URL: `https://api.yourdomain.com/api/webhooks/whatsapp` (must be public HTTPS)
   - Verify token: any random string; put the same value in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the **messages** field
   - Copy **App Secret** (App settings → Basic) into `WHATSAPP_APP_SECRET`; every webhook request's `X-Hub-Signature-256` is verified with it.
7. Restart the API. Submit a test enquiry and open **Admin → Enquiries → (enquiry)**. You should see WhatsApp “Accepted by provider”, then “Sent”/“Delivered” once the webhook reports it.

## How statuses work

| Status | Meaning |
|---|---|
| Not configured (`skipped`) | One or more WhatsApp variables are missing |
| Accepted by provider | Meta returned a message ID. **Not** proof of delivery |
| Sent / Delivered / Read | Reported by Meta's webhook |
| Failed | Error stored. Temporary errors (HTTP 429/5xx, throttling codes, network) are retried automatically with exponential backoff up to `NOTIFICATION_MAX_ATTEMPTS`; permanent errors (e.g. template not approved, invalid parameters) are not retried |

Admins can press **Retry now** on any failed or pending notification.

## Common errors

| Error | Fix |
|---|---|
| `code 132001` template does not exist | Template name/language mismatch or not approved yet |
| `code 132000` parameter count mismatch | Template body must have exactly 5 variables |
| `code 190` / HTTP 401 | Token expired or wrong — use a System User token |
| `code 131030` recipient not in allowed list | Add the recipient number in API Setup (test mode) or take the app live |
| Webhook verification fails | Verify token mismatch, or the callback URL is not reachable over HTTPS |
