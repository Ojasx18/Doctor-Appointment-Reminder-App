import React, { useEffect, useState } from "react";
import { Stethoscope, Users, CalendarDays, ClockArrowUp, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ label, value, icon: Icon, accent, testId }) => (
  <div
    data-testid={testId}
    className="flex flex-col rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className="flex items-center justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
    <div className="mt-5 text-xs uppercase tracking-[0.18em] text-stone-500">{label}</div>
    <div className="mt-2 text-3xl font-semibold text-stone-900" style={{ fontFamily: "Work Sans" }}>{value}</div>
  </div>
);

const statusBadge = (s) => {
  const map = {
    scheduled: "bg-amber-100 text-amber-800 border-amber-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return (
    <Badge variant="outline" className={`capitalize ${map[s] || ""}`}>
      {s}
    </Badge>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/stats");
      setStats(data);
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const triggerReminders = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/reminders/run");
      toast.success(`Reminders sent: ${data.sent} | failed: ${data.failed}`);
      await load();
    } catch (e) {
      toast.error("Failed to run reminders");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Overview</div>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight" style={{ fontFamily: "Work Sans" }}>
            Today at the clinic
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            Daily reminders run automatically at 7:00 AM. You can also send them now.
          </p>
        </div>
        <Button
          data-testid="run-reminders-button"
          onClick={triggerReminders}
          disabled={sending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Run today's reminders
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard testId="stat-doctors" label="Total Doctors" value={stats.total_doctors} icon={Stethoscope} accent="bg-emerald-600" />
        <StatCard testId="stat-patients" label="Total Patients" value={stats.total_patients} icon={Users} accent="bg-stone-700" />
        <StatCard testId="stat-today" label="Today's Appointments" value={stats.today_appointments} icon={CalendarDays} accent="bg-amber-500" />
        <StatCard testId="stat-upcoming" label="Upcoming" value={stats.upcoming_appointments} icon={ClockArrowUp} accent="bg-sky-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <header className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-medium text-stone-900" style={{ fontFamily: "Work Sans" }}>Today</h2>
          </header>
          <div className="divide-y divide-stone-100" data-testid="today-list">
            {stats.today_list.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-stone-500">No appointments today.</div>
            ) : (
              stats.today_list.map((a) => (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-900">{a.patient?.name}</div>
                    <div className="text-xs text-stone-500">
                      Dr. {a.doctor?.name} · {a.appointment_time}
                    </div>
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <header className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-medium text-stone-900" style={{ fontFamily: "Work Sans" }}>Upcoming</h2>
          </header>
          <div className="divide-y divide-stone-100" data-testid="upcoming-list">
            {stats.upcoming_list.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-stone-500">No upcoming appointments.</div>
            ) : (
              stats.upcoming_list.map((a) => (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-900">{a.patient?.name}</div>
                    <div className="text-xs text-stone-500">
                      Dr. {a.doctor?.name} · {a.appointment_date} · {a.appointment_time}
                    </div>
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
