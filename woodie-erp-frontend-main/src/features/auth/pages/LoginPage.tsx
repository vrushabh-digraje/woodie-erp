import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import woodieLogo from "../../../assets/logo/Woodie.png";
import { useAuth } from "../AuthContext";
import { defaultHomePath } from "../permissions";
import { InlineFeedbackAlert } from "../../../components/AppFeedback";
import { themeClasses } from "../../../theme/classes";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@woodie.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to={defaultHomePath(user.role)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.message || (axiosErr.message === "Network Error" ? "Unable to connect to server. Please check your internet or API connection." : axiosErr.message) || "Invalid email or password.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className={`${themeClasses.card} w-full max-w-md p-8`}>
        <div className="mb-6 flex justify-center">
          <img src={woodieLogo} alt="Woodie ERP" className="h-20 w-auto max-w-[240px] object-contain" />
        </div>

        <h1 className="text-center text-xl font-bold text-text-primary">Sign in to Woodie ERP</h1>
        <p className="mt-1 text-center text-sm text-text-muted">Role-based inquiry workflow</p>

        {error ? (
          <InlineFeedbackAlert type="err" className="mt-4">
            {error}
          </InlineFeedbackAlert>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={themeClasses.input}
              placeholder="you@woodie.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${themeClasses.input} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-text-muted hover:bg-surface-border-light hover:text-text-secondary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting} className={`${themeClasses.btnPrimary} w-full py-2.5`}>
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-surface-border bg-surface-border-light px-3 py-3 text-xs text-text-muted">
          <p className="font-medium text-text-secondary">Default admin</p>
          <p className="mt-1">admin@woodie.com / Admin@123</p>
          <p className="mt-2">Other users are created in Team by Admin (Active members can sign in).</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;









