import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const emptyForm = { name: "", phone: "", age: "", gender: "male" };

const Patients = () => {
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
      const { data } = await api.get("/patients", { params: search ? { search } : {} });
      setItems(data);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, phone: p.phone, age: String(p.age), gender: p.gender });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, age: parseInt(form.age, 10) };
      if (editingId) {
        await api.put(`/patients/${editingId}`, payload);
        toast.success("Patient updated");
      } else {
        await api.post("/patients", payload);
        toast.success("Patient added");
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
      await api.delete(`/patients/${deleteId}`);
      toast.success("Patient deleted");
      setDeleteId(null);
      await load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="patients-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Manage</div>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight" style={{ fontFamily: "Work Sans" }}>Patients</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-patient-button" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="patient-dialog">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit patient" : "Add patient"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input data-testid="patient-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input data-testid="patient-phone-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+15551234567" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Age</Label>
                  <Input type="number" min="0" max="150" data-testid="patient-age-input" required value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger data-testid="patient-gender-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="patient-save-button" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
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
        <Input data-testid="patients-search" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Age</th>
              <th className="px-6 py-3">Gender</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin text-stone-400" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center">
                <Users className="h-8 w-8 mx-auto text-stone-300" />
                <div className="mt-2 text-stone-500">No patients yet.</div>
              </td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50" data-testid={`patient-row-${p.id}`}>
                <td className="px-6 py-3 font-medium text-stone-900">{p.name}</td>
                <td className="px-6 py-3 text-stone-600">{p.phone}</td>
                <td className="px-6 py-3 text-stone-600">{p.age}</td>
                <td className="px-6 py-3 text-stone-600 capitalize">{p.gender}</td>
                <td className="px-6 py-3 text-right">
                  <Button variant="ghost" size="icon" data-testid={`edit-patient-${p.id}`} onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4 text-stone-600" />
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`delete-patient-${p.id}`} onClick={() => setDeleteId(p.id)}>
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
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              Their appointments will be marked cancelled. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-patient" onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Patients;
