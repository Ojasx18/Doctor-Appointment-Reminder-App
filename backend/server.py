"""
Doctor Appointment Reminder System - FastAPI Backend
Features: JWT auth, Doctor/Patient/Appointment CRUD, SMS reminders, daily cron.
"""
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "12"))
ADMIN_USERNAME = os.environ["ADMIN_USERNAME"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
SMS_MODE = os.environ.get("SMS_MODE", "mock").lower()
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")
REMINDER_HOUR = int(os.environ.get("REMINDER_CRON_HOUR", "7"))
REMINDER_MINUTE = int(os.environ.get("REMINDER_CRON_MINUTE", "0"))

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("appointments")

# ---------- DB ----------
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ---------- App ----------
app = FastAPI(title="Doctor Appointment Reminder API")
api = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)
scheduler = AsyncIOScheduler()


# ============== Models ==============
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LoginIn(BaseModel):
    username: str
    password: str


class DoctorBase(BaseModel):
    name: str
    specialization: str
    phone: str
    email: EmailStr


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class Doctor(DoctorBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=_now_iso)


class PatientBase(BaseModel):
    name: str
    phone: str
    age: int = Field(ge=0, le=150)
    gender: Literal["male", "female", "other"]


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[Literal["male", "female", "other"]] = None


class Patient(PatientBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=_now_iso)


class AppointmentBase(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    status: Literal["scheduled", "completed", "cancelled"] = "scheduled"


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[Literal["scheduled", "completed", "cancelled"]] = None


class Appointment(AppointmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reminder_sent: bool = False
    created_at: str = Field(default_factory=_now_iso)


# ============== Auth helpers ==============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(payload: dict) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============== SMS Service ==============
async def send_sms(to_phone: str, message: str, appointment_id: Optional[str] = None) -> dict:
    """Send SMS via Twilio if configured, else mock (log + persist)."""
    result = {"to": to_phone, "message": message, "status": "queued", "provider": SMS_MODE, "sent_at": _now_iso()}
    try:
        if SMS_MODE == "twilio" and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            msg = client.messages.create(body=message, from_=TWILIO_PHONE_NUMBER, to=to_phone)
            result["status"] = "sent"
            result["sid"] = msg.sid
            result["provider"] = "twilio"
        else:
            # mock
            logger.info(f"[MOCK SMS] To: {to_phone} | {message}")
            result["status"] = "mock_sent"
    except Exception as e:
        logger.exception("SMS send failed")
        result["status"] = "failed"
        result["error"] = str(e)
    result["appointment_id"] = appointment_id
    await db.sms_logs.insert_one({**result})
    result.pop("_id", None)
    return result


async def run_daily_reminders() -> dict:
    """Find all scheduled appointments for today and send SMS."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor = db.appointments.find({"appointment_date": today_str, "status": "scheduled"}, {"_id": 0})
    sent, failed = 0, 0
    async for appt in cursor:
        patient = await db.patients.find_one({"id": appt["patient_id"]}, {"_id": 0})
        doctor = await db.doctors.find_one({"id": appt["doctor_id"]}, {"_id": 0})
        if not patient or not doctor:
            continue
        msg = (
            f"Hello {patient['name']}, this is a reminder that you have an appointment with "
            f"Dr. {doctor['name']} today at {appt['appointment_time']}. Please arrive 10 minutes early."
        )
        res = await send_sms(patient["phone"], msg, appointment_id=appt["id"])
        if res["status"] in ("sent", "mock_sent"):
            sent += 1
            await db.appointments.update_one({"id": appt["id"]}, {"$set": {"reminder_sent": True}})
        else:
            failed += 1
    logger.info(f"Reminder run done. sent={sent} failed={failed}")
    return {"date": today_str, "sent": sent, "failed": failed}


# ============== Routes ==============
@api.get("/")
async def root():
    return {"message": "Doctor Appointment Reminder API", "status": "ok"}


# ---- Auth
@api.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginIn):
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user={"id": user["id"], "username": user["username"], "role": user["role"]},
    )


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ---- Doctors
@api.get("/doctors", response_model=List[Doctor])
async def list_doctors(search: Optional[str] = None, _=Depends(get_current_user)):
    q = {}
    if search:
        q = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"specialization": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]}
    docs = await db.doctors.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api.post("/doctors", response_model=Doctor)
async def create_doctor(body: DoctorCreate, _=Depends(get_current_user)):
    doc = Doctor(**body.model_dump())
    await db.doctors.insert_one(doc.model_dump())
    return doc


@api.put("/doctors/{doctor_id}", response_model=Doctor)
async def update_doctor(doctor_id: str, body: DoctorUpdate, _=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.doctors.update_one({"id": doctor_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    out = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    return out


@api.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, _=Depends(get_current_user)):
    res = await db.doctors.delete_one({"id": doctor_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    # cascade: cancel related appointments
    await db.appointments.update_many({"doctor_id": doctor_id}, {"$set": {"status": "cancelled"}})
    return {"deleted": True, "id": doctor_id}


# ---- Patients
@api.get("/patients", response_model=List[Patient])
async def list_patients(search: Optional[str] = None, _=Depends(get_current_user)):
    q = {}
    if search:
        q = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]}
    docs = await db.patients.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api.post("/patients", response_model=Patient)
async def create_patient(body: PatientCreate, _=Depends(get_current_user)):
    doc = Patient(**body.model_dump())
    await db.patients.insert_one(doc.model_dump())
    return doc


@api.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, body: PatientUpdate, _=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.patients.update_one({"id": patient_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return await db.patients.find_one({"id": patient_id}, {"_id": 0})


@api.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, _=Depends(get_current_user)):
    res = await db.patients.delete_one({"id": patient_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    await db.appointments.update_many({"patient_id": patient_id}, {"$set": {"status": "cancelled"}})
    return {"deleted": True, "id": patient_id}


# ---- Appointments
async def _enrich_appt(appt: dict) -> dict:
    p = await db.patients.find_one({"id": appt["patient_id"]}, {"_id": 0})
    d = await db.doctors.find_one({"id": appt["doctor_id"]}, {"_id": 0})
    appt["patient"] = p
    appt["doctor"] = d
    return appt


@api.get("/appointments")
async def list_appointments(
    search: Optional[str] = None,
    date: Optional[str] = None,
    doctor_id: Optional[str] = None,
    status_f: Optional[str] = Query(default=None, alias="status"),
    _=Depends(get_current_user),
):
    q = {}
    if date:
        q["appointment_date"] = date
    if doctor_id:
        q["doctor_id"] = doctor_id
    if status_f:
        q["status"] = status_f
    docs = await db.appointments.find(q, {"_id": 0}).sort([("appointment_date", -1), ("appointment_time", -1)]).to_list(2000)
    enriched = [await _enrich_appt(d) for d in docs]
    if search:
        s = search.lower()
        enriched = [
            a for a in enriched
            if (a.get("patient") and s in a["patient"]["name"].lower())
            or (a.get("doctor") and s in a["doctor"]["name"].lower())
        ]
    return enriched


@api.post("/appointments")
async def create_appointment(body: AppointmentCreate, _=Depends(get_current_user)):
    # validate refs
    if not await db.patients.find_one({"id": body.patient_id}):
        raise HTTPException(status_code=400, detail="Patient not found")
    if not await db.doctors.find_one({"id": body.doctor_id}):
        raise HTTPException(status_code=400, detail="Doctor not found")
    doc = Appointment(**body.model_dump())
    await db.appointments.insert_one(doc.model_dump())
    return await _enrich_appt(doc.model_dump())


@api.put("/appointments/{appt_id}")
async def update_appointment(appt_id: str, body: AppointmentUpdate, _=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.appointments.update_one({"id": appt_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    out = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    return await _enrich_appt(out)


@api.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str, _=Depends(get_current_user)):
    res = await db.appointments.delete_one({"id": appt_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"deleted": True, "id": appt_id}


# ---- Dashboard
@api.get("/dashboard/stats")
async def dashboard_stats(_=Depends(get_current_user)):
    today_str = datetime.now().strftime("%Y-%m-%d")
    total_doctors = await db.doctors.count_documents({})
    total_patients = await db.patients.count_documents({})
    today_appts = await db.appointments.count_documents({"appointment_date": today_str})
    upcoming_appts = await db.appointments.count_documents({
        "appointment_date": {"$gt": today_str},
        "status": "scheduled",
    })
    # recent today list (enriched)
    today_docs = await db.appointments.find(
        {"appointment_date": today_str}, {"_id": 0}
    ).sort("appointment_time", 1).to_list(50)
    today_list = [await _enrich_appt(d) for d in today_docs]
    upcoming_docs = await db.appointments.find(
        {"appointment_date": {"$gt": today_str}, "status": "scheduled"}, {"_id": 0}
    ).sort([("appointment_date", 1), ("appointment_time", 1)]).limit(10).to_list(10)
    upcoming_list = [await _enrich_appt(d) for d in upcoming_docs]
    return {
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "today_appointments": today_appts,
        "upcoming_appointments": upcoming_appts,
        "today_list": today_list,
        "upcoming_list": upcoming_list,
    }


# ---- Reminders (manual trigger)
@api.post("/reminders/run")
async def trigger_reminders(_=Depends(get_current_user)):
    return await run_daily_reminders()


@api.get("/sms-logs")
async def sms_logs(limit: int = 50, _=Depends(get_current_user)):
    logs = await db.sms_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return logs


# ============== Startup ==============
async def seed_admin():
    existing = await db.users.find_one({"username": ADMIN_USERNAME})
    if existing:
        # ensure password matches in case env updated
        if not verify_password(ADMIN_PASSWORD, existing["password"]):
            await db.users.update_one(
                {"username": ADMIN_USERNAME},
                {"$set": {"password": hash_password(ADMIN_PASSWORD)}},
            )
            logger.info("Admin password updated from .env")
        return
    admin = {
        "id": str(uuid.uuid4()),
        "username": ADMIN_USERNAME,
        "password": hash_password(ADMIN_PASSWORD),
        "role": "admin",
        "created_at": _now_iso(),
    }
    await db.users.insert_one(admin)
    logger.info(f"Seeded admin user: {ADMIN_USERNAME}")


@app.on_event("startup")
async def on_startup():
    await seed_admin()
    # indexes
    await db.doctors.create_index("id", unique=True)
    await db.patients.create_index("id", unique=True)
    await db.appointments.create_index("id", unique=True)
    await db.appointments.create_index("appointment_date")
    await db.appointments.create_index("doctor_id")
    await db.users.create_index("username", unique=True)
    # scheduler
    if not scheduler.running:
        scheduler.add_job(
            run_daily_reminders,
            CronTrigger(hour=REMINDER_HOUR, minute=REMINDER_MINUTE),
            id="daily_reminders",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"Scheduler started. Daily reminders at {REMINDER_HOUR:02d}:{REMINDER_MINUTE:02d}")


@app.on_event("shutdown")
async def on_shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)
    mongo_client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
