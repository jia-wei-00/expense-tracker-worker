# API Documentation

Base URL: `https://your-worker.workers.dev`

All authenticated endpoints require a Supabase session token in the `Authorization` header:
```
Authorization: Bearer <supabase_access_token>
```

---

## POST `/whatsapp/link`

Link a WhatsApp phone number to the authenticated user's account. Sends a verification template message to the provided number. Only one number per user — submitting again replaces the existing number.

**Auth**: Required

**Request**
```json
{
  "phoneNumber": "60123456789"
}
```

> Use international format without the `+` sign.

**Response `200`**
```json
{
  "message": "Verification sent"
}
```

**Response `400`**
```json
{
  "error": "phoneNumber is required"
}
```

**Response `401`**
```json
{
  "error": "Unauthorized"
}
```

**Response `500`**
```json
{
  "error": "Failed to save number"
}
```

**Notes**
- The number is saved with `is_verified: false` until the user taps **Verify My Number** in the WhatsApp message
- Verified status can be read from the `whatsapp_users` Supabase table (`is_verified` column)

---

## POST `/chat`

Send a message to the AI agent. The agent can read expenses, add new ones, and delete existing ones. Write operations (add/delete) return `pendingToolCalls` for the client to confirm before executing.

**Auth**: Required

**Request**
```json
{
  "messages": [
    { "role": "user", "content": "I spent RM15 on lunch today" }
  ],
  "analyticsMode": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `messages` | `ChatCompletionMessageParam[]` | Yes | Full conversation history in OpenAI message format |
| `analyticsMode` | `boolean` | No | When `true`, returns financial insights instead of expense management |

**Response `200` — AI text reply**
```json
{
  "message": "Got it! I'll add RM15 for lunch.",
  "pendingToolCalls": null
}
```

**Response `200` — Pending write confirmation**
```json
{
  "message": null,
  "pendingToolCalls": [
    {
      "toolName": "addExpense",
      "args": {
        "name": "Lunch",
        "amount": 15,
        "category": 3,
        "is_expense": true,
        "spend_date": "2026-05-24T12:00:00.000Z"
      }
    }
  ]
}
```

When `pendingToolCalls` is returned, display a confirmation UI to the user. On confirm, execute the Supabase write directly from the client. On cancel, discard the pending calls.

**`toolName` values**

| Value | Description |
|---|---|
| `addExpense` | Insert a new row into the `expense` table |
| `deleteExpense` | Delete a row from the `expense` table by `id` |

**Response `429`**
```json
{
  "error": "AI rate limit reached. Please try again in a moment."
}
```

**Response `500`**
```json
{
  "error": "Internal server error"
}
```

---

## GET `/whatsapp`

Meta webhook verification endpoint. Used by Meta during webhook setup — do not call this directly.

---

## POST `/whatsapp`

Meta webhook incoming message endpoint. Called by Meta's servers when a user sends a WhatsApp message — do not call this directly.
