import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { ROLE_OPTIONS } from "../../../config/rbac";
import { InlineFeedbackAlert } from "../../../components/AppFeedback";
import { themeClasses } from "../../../theme/classes";
import type { TeamMemberPayload, TeamMemberStatus } from "../services/teamTypes";

const statuses: TeamMemberStatus[] = ["Active", "Inactive"];

type TeamFormProps = {
  mode?: "create" | "edit";
  initialValues?: Omit<TeamMemberPayload, "password" | "generatePassword"> | null;
  onSubmit: (payload: TeamMemberPayload) => Promise<TeamMemberPayload & { generatedPassword?: string }>;
};

const empty: Omit<TeamMemberPayload, "password" | "generatePassword"> = {
  name: "",
  phone: "",
  email: "",
  role: "site_engineer",
  status: "Active",
};

function TeamForm({ mode = "create", initialValues = null, onSubmit }: TeamFormProps) {
  const [form, setForm] = useState(empty);
  const [password, setPassword] = useState("");
  const [generatePassword, setGeneratePassword] = useState(mode === "create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPw, setGeneratedPw] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) setForm(initialValues);
    else if (mode === "create") setForm(empty);
  }, [initialValues, mode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setGeneratedPw(null);
    if (!/^\d{10}$/.test(form.phone)) {
      setError("Phone must be exactly 10 digits.");
      return;
    }
    if (mode === "create" && !generatePassword && password.length < 6) {
      setError("Password must be at least 6 characters, or use Generate Password.");
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        ...(mode === "create" || password || generatePassword
          ? { password: generatePassword ? undefined : password, generatePassword }
          : {}),
      });
      if (result.generatedPassword) setGeneratedPw(result.generatedPassword);
      if (mode === "create" && !result.generatedPassword) {
        setForm(empty);
        setPassword("");
      }
    } catch {
      setError("Failed to save team member.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <InlineFeedbackAlert type="err">{error}</InlineFeedbackAlert> : null}
      {generatedPw ? (
        <InlineFeedbackAlert type="ok">
          Generated password (copy now): <strong className="font-bold">{generatedPw}</strong>
        </InlineFeedbackAlert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name" value={form.name} required onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
        <Field label="Phone" value={form.phone} required onChange={(v) => setForm((p) => ({ ...p, phone: v.replace(/\D/g, "").slice(0, 10) }))} />
        <Field label="Email" type="email" value={form.email} required onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as typeof form.role }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TeamMemberStatus }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-800">{mode === "create" ? "Login password" : "Reset password (optional)"}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={generatePassword} onChange={(e) => setGeneratePassword(e.target.checked)} />
          Generate password automatically
        </label>
        {!generatePassword ? (
          <Field label="Password" type="password" value={password} onChange={setPassword} />
        ) : null}
      </div>

      <button type="submit" disabled={loading} className={themeClasses.btnNavy}>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "edit" ? "Update" : "Create"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}

export default TeamForm;




