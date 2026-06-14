import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOGIN_BG =
  "https://images.unsplash.com/photo-1762625570087-6d98fca29531?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBicmlnaHQlMjBtZWRpY2FsJTIwY2xpbmljJTIwaW50ZXJpb3J8ZW58MHx8fHwxNzgxNDYzODAxfDA&ixlib=rb-4.1.0&q=85";

const Login = () => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Welcome back");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:block relative">
        <img src={LOGIN_BG} alt="clinic" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-stone-900/40" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">Hospital Operations</div>
          <h1 className="mt-4 text-4xl lg:text-5xl font-semibold tracking-tight" style={{ fontFamily: "Work Sans" }}>
            Calm, reliable<br />appointment reminders.
          </h1>
          <p className="mt-4 text-stone-200 max-w-md">
            Manage doctors, patients and daily appointments — automated SMS keeps everyone on time.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 bg-stone-50">
        <div className="w-full max-w-sm" data-testid="login-card">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-stone-900" style={{ fontFamily: "Work Sans" }}>ClinicReminder</div>
              <div className="text-xs text-stone-500">Admin Portal</div>
            </div>
          </div>

          <h2 className="text-3xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: "Work Sans" }}>
            Sign in
          </h2>
          <p className="text-stone-500 text-sm mt-1">Welcome back. Enter your details below.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="username" className="text-stone-700">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-stone-700">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-4 text-xs text-stone-500">
            <div className="font-medium text-stone-700 mb-1">Demo credentials</div>
            admin / admin123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
