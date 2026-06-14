import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserRound, CalendarClock, LogOut, Stethoscope, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/doctors", label: "Doctors", icon: Stethoscope, testId: "nav-doctors" },
  { to: "/patients", label: "Patients", icon: Users, testId: "nav-patients" },
  { to: "/appointments", label: "Appointments", icon: CalendarClock, testId: "nav-appointments" },
];

const SidebarBody = ({ onNavigate }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-stone-900" style={{ fontFamily: "Work Sans" }}>ClinicReminder</div>
            <div className="text-xs text-stone-500">Hospital Suite</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon, testId }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              data-testid={testId}
              onClick={onNavigate}
              className={`app-shell-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                active
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-stone-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-200 px-3 py-4">
        <div className="px-3 pb-3">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-400">Signed in</div>
          <div className="font-medium text-stone-800 text-sm mt-1" data-testid="sidebar-username">
            {user?.username}
          </div>
        </div>
        <Button
          variant="ghost"
          data-testid="logout-button"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-stone-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 fixed top-0 left-0 h-screen border-r border-stone-200 bg-white">
        <SidebarBody />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <UserRound className="h-4 w-4" />
          </div>
          <span className="font-semibold text-stone-900">ClinicReminder</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-toggle">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <main className="md:ml-64 p-6 md:p-8">{children}</main>
    </div>
  );
};

export default DashboardLayout;
