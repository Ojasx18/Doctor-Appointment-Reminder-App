"""Backend API tests for Doctor Appointment Reminder System."""
import os
from datetime import datetime, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://health-notify-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["user"]["username"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Auth
def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_me_requires_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_me_ok(H):
    r = requests.get(f"{API}/auth/me", headers=H, timeout=15)
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


# ---- Doctors CRUD
def test_doctor_crud(H):
    payload = {"name": "TEST_DocA", "specialization": "Cardiology", "phone": "+15550000001", "email": "test_doca@example.com"}
    r = requests.post(f"{API}/doctors", json=payload, headers=H, timeout=15)
    assert r.status_code == 200, r.text
    did = r.json()["id"]
    # search
    r = requests.get(f"{API}/doctors?search=TEST_DocA", headers=H, timeout=15)
    assert r.status_code == 200 and any(d["id"] == did for d in r.json())
    # update
    r = requests.put(f"{API}/doctors/{did}", json={"specialization": "Neurology"}, headers=H, timeout=15)
    assert r.status_code == 200 and r.json()["specialization"] == "Neurology"
    # verify get
    r = requests.get(f"{API}/doctors?search=TEST_DocA", headers=H, timeout=15)
    assert any(d["id"] == did and d["specialization"] == "Neurology" for d in r.json())
    # delete
    r = requests.delete(f"{API}/doctors/{did}", headers=H, timeout=15)
    assert r.status_code == 200


# ---- Patients CRUD
def test_patient_crud(H):
    payload = {"name": "TEST_PatA", "phone": "+15550001001", "age": 30, "gender": "male"}
    r = requests.post(f"{API}/patients", json=payload, headers=H, timeout=15)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    r = requests.put(f"{API}/patients/{pid}", json={"age": 31}, headers=H, timeout=15)
    assert r.status_code == 200 and r.json()["age"] == 31
    r = requests.delete(f"{API}/patients/{pid}", headers=H, timeout=15)
    assert r.status_code == 200


# ---- Appointments + cascade + filters + dashboard + reminders
def test_appointment_full_flow(H):
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    # Create doc + patient
    doc = requests.post(f"{API}/doctors", json={"name": "TEST_DocB", "specialization": "GP", "phone": "+15550000002", "email": "test_docb@example.com"}, headers=H, timeout=15).json()
    pat = requests.post(f"{API}/patients", json={"name": "TEST_PatB", "phone": "+15550001002", "age": 40, "gender": "female"}, headers=H, timeout=15).json()

    # invalid refs
    r = requests.post(f"{API}/appointments", json={"patient_id": "bad", "doctor_id": doc["id"], "appointment_date": today, "appointment_time": "10:00"}, headers=H, timeout=15)
    assert r.status_code == 400
    r = requests.post(f"{API}/appointments", json={"patient_id": pat["id"], "doctor_id": "bad", "appointment_date": today, "appointment_time": "10:00"}, headers=H, timeout=15)
    assert r.status_code == 400

    # create today + future
    a1 = requests.post(f"{API}/appointments", json={"patient_id": pat["id"], "doctor_id": doc["id"], "appointment_date": today, "appointment_time": "09:30"}, headers=H, timeout=15)
    assert a1.status_code == 200, a1.text
    a1d = a1.json()
    assert a1d["patient"]["id"] == pat["id"] and a1d["doctor"]["id"] == doc["id"]
    a2 = requests.post(f"{API}/appointments", json={"patient_id": pat["id"], "doctor_id": doc["id"], "appointment_date": future, "appointment_time": "11:00"}, headers=H, timeout=15)
    assert a2.status_code == 200
    a2id = a2.json()["id"]

    # filters
    r = requests.get(f"{API}/appointments?date={today}", headers=H, timeout=15)
    assert r.status_code == 200 and all(a["appointment_date"] == today for a in r.json())
    r = requests.get(f"{API}/appointments?doctor_id={doc['id']}", headers=H, timeout=15)
    assert r.status_code == 200 and all(a["doctor_id"] == doc["id"] for a in r.json())
    r = requests.get(f"{API}/appointments?status=scheduled", headers=H, timeout=15)
    assert r.status_code == 200

    # update
    r = requests.put(f"{API}/appointments/{a2id}", json={"status": "completed"}, headers=H, timeout=15)
    assert r.status_code == 200 and r.json()["status"] == "completed"

    # dashboard
    r = requests.get(f"{API}/dashboard/stats", headers=H, timeout=15)
    assert r.status_code == 200
    s = r.json()
    for k in ["total_doctors", "total_patients", "today_appointments", "upcoming_appointments", "today_list", "upcoming_list"]:
        assert k in s

    # reminders
    r = requests.post(f"{API}/reminders/run", headers=H, timeout=30)
    assert r.status_code == 200, r.text
    rd = r.json()
    assert "date" in rd and "sent" in rd and "failed" in rd and rd["sent"] >= 1

    # verify reminder_sent on a1
    r = requests.get(f"{API}/appointments?date={today}", headers=H, timeout=15)
    assert any(a["id"] == a1d["id"] and a["reminder_sent"] for a in r.json())

    # sms logs
    r = requests.get(f"{API}/sms-logs", headers=H, timeout=15)
    assert r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) >= 1

    # cascade: delete doctor → appointments cancelled
    requests.delete(f"{API}/doctors/{doc['id']}", headers=H, timeout=15)
    r = requests.get(f"{API}/appointments?doctor_id={doc['id']}", headers=H, timeout=15)
    for a in r.json():
        assert a["status"] == "cancelled"

    # cleanup
    requests.delete(f"{API}/appointments/{a1d['id']}", headers=H, timeout=15)
    requests.delete(f"{API}/appointments/{a2id}", headers=H, timeout=15)
    requests.delete(f"{API}/patients/{pat['id']}", headers=H, timeout=15)
