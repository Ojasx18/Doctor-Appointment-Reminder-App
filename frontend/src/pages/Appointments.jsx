import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, CalendarClock, Filter } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyForm = { patient_id: "", doctor_id: "", appointment_date: todayStr(), appointment_time: "09:00", status: "scheduled" };

const statusBadge = (s) => {
  const map = {
    scheduled: "bg-amber-100 text-amber-800 border-amber-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return <Badge variant="outline" className={`capitalize ${map[s] || ""}`}>{s}</Badge>;
};

const Appointments = () => {
  const [items, setItems] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterDate) params.date = filterDate;
      if (filterDoctor && filterDoctor !== "all") params.doctor_id = filterDoctor;
      if (filterStatus && filterStatus !== "all") params.status = filterStatus;
      const { data } = await api.get("/appointments", { params });
      setItems(data);
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const loadRefs = async () => {
    try {
      const [docs, pats] = await Promise.all([api.get("/doctors"), api.get("/patients")]);
      setDoctors(docs.data);
      setPatients(pats.data);
    } catch {
      // silent
    }
  };

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, filterDate, filterDoctor, filterStatus]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, patient_id: patients[0]?.id || "", doctor_id: doctors[0]?.id || "" });
    setOpen(true);
  };
  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      patient_id: a.patient_id, doctor_id: a.doctor_id,
      appointment_date: a.appointment_date, appointment_time: a.appointment_time, status: a.status,
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.doctor_id) {
      toast.error("Select a patient and doctor");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/appointments/${editingId}`, form);
        toast.success("Appointment updated");
      } else {
        await api.post("/appointments", form);
        toast.success("Appointment created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/appointments/${deleteId}`);
      toast.success("Appointment deleted");
      setDeleteId(null);
      await load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const hasFilters = useMemo(() => !!(search || filterDate || (filterDoctor && filterDoctor !== "all") || (filterStatus && filterStatus !== "all")), [search, filterDate, filterDoctor, filterStatus]);

  return (
    <div className="space-y-6" data-testid="appointments-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Manage</div>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight" style={{ fontFamily: "Work Sans" }}>Appointments</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-appointment-button" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="appointment-dialog">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit appointment" : "New appointment"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger data-testid="appointment-patient-select"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Doctor</Label>
                <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger data-testid="appointment-doctor-select"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.name} · {d.specialization}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" data-testid="appointment-date-input" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" data-testid="appointment-time-input" required value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="appointment-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="appointment-save-button" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input data-testid="appointments-search" placeholder="Search by patient or doctor…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" data-testid="appointments-date-filter" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="md:w-44" />
        <Select value={filterDoctor} onValueChange={setFilterDoctor}>
          <SelectTrigger className="md:w-56" data-testid="appointments-doctor-filter"><SelectValue placeholder="All doctors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All doctors</SelectItem>
            {doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="md:w-40" data-testid="appointments-status-filter"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={() => { setSearch(""); setFilterDate(""); setFilterDoctor("all"); setFilterStatus("all"); }} data-testid="appointments-clear-filters">
            <Filter className="h-4 w-4 mr-2" /> Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-6 py-3">Patient</th>
              <th className="px-6 py-3">Doctor</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Reminder</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin text-stone-400" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center">
                <CalendarClock className="h-8 w-8 mx-auto text-stone-300" />
                <div className="mt-2 text-stone-500">No appointments match.</div>
              </td></tr>
            ) : items.map((a) => (
              <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50" data-testid={`appointment-row-${a.id}`}>
                <td className="px-6 py-3 font-medium text-stone-900">{a.patient?.name || "—"}</td>
                <td className="px-6 py-3 text-stone-700">Dr. {a.doctor?.name || "—"}</td>
                <td className="px-6 py-3 text-stone-600">{a.appointment_date}</td>
                <td className="px-6 py-3 text-stone-600">{a.appointment_time}</td>
                <td className="px-6 py-3">{statusBadge(a.status)}</td>
                <td className="px-6 py-3 text-stone-600">{a.reminder_sent ? "Sent" : "—"}</td>
                <td className="px-6 py-3 text-right">
                  <Button variant="ghost" size="icon" data-testid={`edit-appointment-${a.id}`} onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4 text-stone-600" />
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`delete-appointment-${a.id}`} onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-appointment" onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Appointments;
