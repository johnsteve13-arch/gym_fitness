# Philippine SMS API Integration Guide (Semaphore.co)
## Apex Iron Athletic Club — Enterprise Gym Management Platform

This document outlines the architecture, configuration, testing procedures, and operational guidelines for the server-side cellular SMS notification system using **Semaphore** (https://semaphore.co).

---

## 1. Architecture Overview

Apex Iron utilizes a decoupled, transactional notification architecture designed for reliability, compliance, and multi-channel resilience:

- **Dedicated SMS Engine**: [`backend/src/services/sms.service.ts`](file:///backend/src/services/sms.service.ts)
- **Persistent Outbox & Audit Log**: `sms_notification_logs` table in Supabase PostgreSQL
- **Granular User Preferences**: `user_notification_preferences` table allowing athletes and coaches to toggle specific SMS categories
- **Decoupled Execution**: Core operations (e.g., booking creation, payment capture) commit inside strict database transactions; outbound SMS dispatch occurs immediately following the commit to ensure third-party network hiccups never cause database rollbacks.
- **Idempotency**: Prevents accidental duplicate message delivery using unique idempotency keys per event and entity.
- **Safe Development & CI**: By default, `SMS_DRY_RUN=true` simulates dispatches with structured console logs and database records without charging cellular credits.

---

## 2. Semaphore Provider Setup

1. **Sign Up**:
   Create an account at [Semaphore.co](https://semaphore.co).

2. **Obtain API Key**:
   Navigate to **Account > API** in your Semaphore dashboard and copy your API Key.

3. **Approved Sender Name (Optional / Recommended)**:
   By default, messages originate from `SEMAPHORE`. To deliver messages from your custom gym name (e.g., `APEXIRON`):
   - Navigate to **Sender Names** in your Semaphore dashboard.
   - Submit your custom alphanumeric Sender ID (maximum 11 characters) along with your business registration documents as required by Philippine NTC (National Telecommunications Commission) regulations.
   - Once approved, set `SMS_SENDER_NAME="APEXIRON"`.

---

## 3. Environment Variables Configuration

Add the following variables to your environment configuration (`backend/.env` locally, or Environment Variables settings on **Render**):

```bash
# Philippine SMS Provider
SMS_PROVIDER=semaphore

# Your Semaphore API Key from semaphore.co
SMS_API_KEY="your-semaphore-api-key-here"

# Approved Sender Name (leave empty or omit to use Semaphore default)
SMS_SENDER_NAME="APEXIRON"

# Master toggle for outbound SMS
SMS_ENABLED=true

# Default Country Code for number normalization (63 for Philippines)
SMS_DEFAULT_COUNTRY_CODE=63

# Set to false in production to send real SMS; set to true in dev/staging/CI
SMS_DRY_RUN=false
```

> [!CAUTION]
> **Security Rule**: Never expose `SMS_API_KEY` in frontend bundles, GitHub repositories, or client-facing responses. It must only exist in backend environment variables.

---

## 4. Supported Business Notification Events

The platform implements 13 standard notification events:

| # | Event Type | Description | Trigger |
|---|------------|-------------|---------|
| 1 | `booking_requested` | Unpaid / Pending reservation alert | Member books trainer session via Direct Payment |
| 2 | `booking_confirmed` | Confirmation of scheduled training | Member pays with Coins or completes invoice |
| 3 | `booking_declined` | Decline notice with safe reason | Trainer declines or scheduling conflict detected |
| 4 | `booking_cancelled_trainer` | Reschedule request notice | Coach cancels booked session |
| 5 | `booking_cancelled_member` | Cancellation confirmation | Athlete cancels existing reservation |
| 6 | `session_reminder` | Upcoming workout session alert | Automated reminder job (1-2 hours prior) |
| 7 | `membership_expiring` | Expiry warning (7 days / 1 day) | Automated membership expiration scanner |
| 8 | `membership_renewed` | Membership term extension receipt | Successful membership renewal or upgrade |
| 9 | `payment_success` | Official transaction receipt (PHP) | Invoice payment verified and captured |
| 10 | `payment_failed` | Failed transaction alert | Online payment gateway rejection |
| 11 | `class_confirmed` | Group fitness reservation confirmed | Athlete registers for a group class |
| 12 | `class_cancelled` | Cancellation & schedule alert | Coach or Admin cancels group fitness class |
| 13 | `security_alert` | Account password change / access | High-privilege security action taken |

---

## 5. Phone Number Normalization

Philippine mobile phone formats are automatically sanitized and normalized by `SmsService.normalizePhilippineNumber()`:

- `+63 (917) 123-4567` $\rightarrow$ `09171234567` (Standard National) and `+639171234567` (International)
- `0918-555-0192` $\rightarrow$ `09185550192`
- `9281234567` $\rightarrow$ `09281234567`

Numbers with invalid country prefixes or incorrect digit lengths are rejected prior to gateway dispatch, saving API credits.

---

## 6. Testing & Verification

### A. Dry-Run Verification (No Credits Used)
With `SMS_DRY_RUN=true` (the default):
```bash
cd backend
npm test
```
The test suite validates:
- Phone number normalization algorithms
- Event template rendering for all 13 events
- User notification preference filtering
- Database logging of simulated delivery receipts

### B. Admin Test Endpoint
Authorized Administrators can dispatch a test message via REST API:
```http
POST /api/sms/test
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "phone": "09171234567",
  "message": "Apex Iron SMS Gateway test verification message."
}
```

### C. Inspecting Delivery Logs & Stats
- **Statistics**: `GET /api/sms/stats` returns total sent, accepted, delivered, and failed message counts.
- **Audit Logs**: `GET /api/sms/logs?page=1&limit=20` returns full delivery logs with recipient, timestamp, and provider message IDs.
- **Retry**: `POST /api/sms/retry/:id` re-queues any failed message with backoff.
