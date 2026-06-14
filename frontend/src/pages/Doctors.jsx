import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyForm = { name: "", specialization: "", phone: "", email: "" };

const Doctors = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/doctors", { params: search ? { search } : {} });
      setItems(data);
    } catch {
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // initial
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (d) => { setEditingId(d.id); setForm({ name: d.name, specialization: d.specialization, phone: d.phone, email: d.email }); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/doctors/${editingId}`, form);
        toast.success("Doctor updated");
      } else {
        await api.post("/doctors", form);
        toast.success("Doctor added");
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
      await api.delete(`/doctors/${deleteId}`);
      toast.success("Doctor deleted");
      setDeleteId(null);
      await load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="doctors-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Manage</div>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight" style={{ fontFamily: "Work Sans" }}>Doctors</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-doctor-button" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="doctor-dialog">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit doctor" : "Add doctor"}</DialogTitle>
              <DialogDescription>Enter the doctor's professional details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input data-testid="doctor-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Specialization</Label>
                <Input data-testid="doctor-specialization-input" required value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input data-testid="doctor-phone-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+15551234567" />
              </div>
              <div>
                <Label>Email</Label>
                <Input data-testid="doctor-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="doctor-save-button" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        <Input
          data-testid="doctors-search"
          placeholder="Search by name, specialty, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Specialization</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-stone-500"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center">
                <Stethoscope className="h-8 w-8 mx-auto text-stone-300" />
                <div className="mt-2 text-stone-500">No doctors yet. Add your first.</div>
              </td></tr>
            ) : items.map((d) => (
              <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50" data-testid={`doctor-row-${d.id}`}>
                <td className="px-6 py-3 font-medium text-stone-900">Dr. {d.name}</td>
                <td className="px-6 py-3 text-stone-700">{d.specialization}</td>
                <td className="px-6 py-3 text-stone-600">{d.phone}</td>
                <td className="px-6 py-3 text-stone-600">{d.email}</td>
                <td className="px-6 py-3 text-right">
                  <Button variant="ghost" size="icon" data-testid={`edit-doctor-${d.id}`} onClick={() => openEdit(d)}>
                    <Pencil className="h-4 w-4 text-stone-600" />
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`delete-doctor-${d.id}`} onClick={() => setDeleteId(d.id)}>
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
            <AlertDialogTitle>Delete doctor?</AlertDialogTitle>
            <AlertDialogDescription>
              Their appointments will be marked cancelled. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-doctor" onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Doctors;
