# PRD — Doctor Appointment Reminder System (ClinicReminder)

## Original problem statement
Web app for clinics where staff manage doctors, patients and appointments.
The system automatically sends an SMS reminder to patients on the day of their appointment.

## User-chosen stack & decisions
- Stack: **FastAPI + MongoDB + React** (adapted from spec's Node/MySQL because of platform env)
- SMS: **Twilio** integration code in place, currently running in **MOCKED** mode (`SMS_MODE=mock`)
- Auth: **JWT** with seeded default admin `admin / admin123`
- Reminder cron: **daily at 07:00** server time (configurable via env)
- Postman/deployment docs: skipped

## Architecture
- `/app/backend/server.py` — single-file FastAPI app. Routers under `/api`. Modules: auth, doctors, patients, appointments, dashboard, reminders, sms-logs. APScheduler runs `run_daily_reminders` daily.
- `/app/frontend/src/` — React + react-router. AuthContext + ProtectedRoute, DashboardLayout with sidebar + sheet (mobile). Pages: Login, Dashboard, Doctors, Patients, Appointments.
- Mongo collections: `users`, `doctors`, `patients`, `appointments`, `sms_logs`.

## Implemented (2026-06-14)
- JWT login, seeded admin, /auth/me
- Full CRUD: doctors, patients, appointments (with patient+doctor enrichment)
- Search & filter on all 3 entities; appointments support date / doctor / status filters
- Dashboard stats endpoint (today + upcoming lists)
- Mock SMS service with persistent `sms_logs`
- APScheduler cron @ 7AM + manual POST `/api/reminders/run`
- Cascade cancel on doctor/patient delete
- React UI: emerald/stone palette, Work Sans + IBM Plex Sans, responsive sidebar, sonner toasts, shadcn dialogs/selects/alerts

## Test status
- Backend pytest: 6/6 ✅ (`/app/backend/tests/backend_test.py`)
- Frontend e2e (testing agent): all critical flows ✅
- See `/app/test_reports/iteration_1.json`

## Backlog
- P1: Toggle SMS_MODE to `twilio` once user supplies Twilio creds
- P2: Audit-log past `completed` appointments and exclude from cascade-cancel
- P2: Per-patient appointment history view
- P2: CSV export for appointments
- P3: Recurring appointments, multi-clinic support, role-based users beyond admin
