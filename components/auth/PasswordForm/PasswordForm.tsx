"use client";

import { Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";

import { showVisualAssistant } from "@/components/assistant/visualAssistantEvents";
import { Button } from "@/components/ui/Button";

import styles from "./PasswordForm.module.css";

const PASSWORD_MIN_LENGTH = 8;

interface PasswordUpdateResult {
  success: boolean;
  message: string;
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

interface PasswordFormProps {
  submitLabel: string;
  onSubmit: (password: string, currentPassword?: string) => Promise<PasswordUpdateResult>;
  requireCurrentPassword?: boolean;
  onSuccess?: () => void;
}

export function PasswordForm({
  submitLabel,
  onSubmit,
  onSuccess,
  requireCurrentPassword = false,
}: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  function validate(): string | null {
    if (requireCurrentPassword && !currentPassword) {
      return "اكتبي كلمة المرور الحالية أولًا.";
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `كلمة المرور لازم تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
    }

    if (password !== confirmPassword) {
      return "كلمتا المرور غير متطابقتين.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);

    const validationError = validate();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      showVisualAssistant({ mood: "confused", text: validationError, duration: 7500, priority: 3 });
      return;
    }

    setLoading(true);

    try {
      const result = await onSubmit(password, requireCurrentPassword ? currentPassword : undefined);

      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        showVisualAssistant({ mood: "sympathy", text: result.message, duration: 8000, priority: 3 });
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setMessage({ type: "success", text: result.message });
      showVisualAssistant({ mood: "celebrate", text: result.message, duration: 7500, priority: 4 });
      onSuccess?.();
    } catch {
      setMessage({
        type: "error",
        text: "حدث خطأ غير متوقع. حاولي مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {requireCurrentPassword && (
        <label className={styles.field}>
          <span>كلمة المرور الحالية</span>
          <div><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="اكتبي كلمة المرور الحالية" autoComplete="current-password" disabled={loading} required /></div>
        </label>
      )}
      <label className={styles.field}>
        <span>كلمة المرور الجديدة</span>

        <div>
          <LockKeyhole size={18} />

          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`${PASSWORD_MIN_LENGTH} أحرف على الأقل`}
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            disabled={loading}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>

      <label className={styles.field}>
        <span>تأكيد كلمة المرور الجديدة</span>

        <div>
          <KeyRound size={18} />

          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="أعيدي كتابة كلمة المرور"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            disabled={loading}
            required
          />
        </div>
      </label>

      {message && (
        <div
          className={`${styles.message} ${styles[message.type]}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </div>
      )}

      <Button fullWidth size="large" type="submit" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
