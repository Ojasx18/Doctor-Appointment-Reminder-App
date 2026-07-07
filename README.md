# 🏥 Clinic Reminder – Doctor Appointment Management System

## Overview

**Clinic Reminder** is a full-stack web application developed to simplify clinic operations by digitizing the management of doctors, patients, and appointments while automating SMS reminders for scheduled visits.

The application provides a centralized dashboard for administrators to efficiently manage daily clinic activities, reducing manual effort and minimizing missed appointments through automated notifications.

---

## ✨ Features

* 🔐 Secure Admin Authentication using JWT
* 👨‍⚕️ Doctor Management (Add, Edit, Delete)
* 🧑‍🤝‍🧑 Patient Management
* 📅 Appointment Scheduling and Management
* 📊 Interactive Dashboard with Clinic Statistics
* 📩 Automated SMS Appointment Reminders using Twilio
* ⏰ Daily Reminder Scheduling with APScheduler
* 📱 Responsive and Modern User Interface
* 🗄️ MongoDB Database Integration
* 🔄 RESTful API Architecture

---

## 🛠️ Tech Stack

### Frontend

* React.js
* React Router
* Axios
* Tailwind CSS
* ShadCN UI

### Backend

* FastAPI (Python)
* APScheduler
* JWT Authentication
* Twilio SMS API

### Database

* MongoDB

### Tools

* Git & GitHub
* VS Code
* Postman

---

## 📌 Project Workflow

1. Administrator logs into the system.
2. Doctors and patients are registered.
3. Appointments are scheduled with date and time.
4. Appointment details are securely stored in MongoDB.
5. APScheduler periodically checks for upcoming appointments.
6. Twilio API sends automated SMS reminders to patients before their appointments.
7. Dashboard displays real-time statistics for doctors, patients, and appointments.

---

## 📂 Project Structure

```text
frontend/
│── React.js
│── Tailwind CSS
│── Components
│── Pages

backend/
│── FastAPI
│── Authentication
│── Reminder Scheduler
│── Twilio Integration
│── MongoDB Models
```

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/yourusername/clinic-reminder.git
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

python -m uvicorn server:app --reload
```

---

## Environment Variables

Create a `.env` file inside the `backend` directory.

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=doctor_reminder

JWT_SECRET=your_secure_secret_key

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password

SMS_MODE=twilio

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

For frontend, create a `.env` file inside the `frontend` directory.

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 📸 Screenshots

* Login Page
* <img width="1350" height="798" alt="Screenshot 2026-07-07 144300" src="https://github.com/user-attachments/assets/a9d7a35b-bc81-4f42-92f4-e8c799f592ba" />

* Dashboard
* <img width="1352" height="797" alt="Screenshot 2026-07-07 144315" src="https://github.com/user-attachments/assets/b8b52316-8520-4fd6-99ed-320e97b01d2b" />

* Doctor Management
* <img width="1357" height="806" alt="Screenshot 2026-07-07 143355" src="https://github.com/user-attachments/assets/1caaa245-608b-453c-b71c-ff61521473f6" />

* Patient Management
* <img width="1345" height="802" alt="Screenshot 2026-07-07 143423" src="https://github.com/user-attachments/assets/b19ebc91-cd5f-4184-9bf7-b948a9ed51dc" />

* Appointment Scheduling
* <img width="1358" height="806" alt="Screenshot 2026-07-07 143452" src="https://github.com/user-attachments/assets/f8e1c698-bc37-4779-a5f8-abb1f257aa2e" />

* SMS Reminder Workflow
* <img width="1240" height="2772" alt="Screenshot_2026-07-07-14-38-42-09_0ce57feeccaa51fb7deed04b4dbda235" src="https://github.com/user-attachments/assets/cc30e733-cafb-4e49-9aee-e99dea3f0781" />


---

## 🎯 Future Enhancements

* Patient Self-Service Portal
* Doctor Dashboard
* Email Reminder Integration
* WhatsApp Notifications
* Calendar Synchronization
* Role-Based Access Control
* Medical History Management
* Appointment Rescheduling
* Analytics & Reporting

---

## 👨‍💻 Author

**Ojas Manakapure**

B.Tech Computer Science Engineering

---

## ⭐ If you found this project useful, consider giving it a star on GitHub!
