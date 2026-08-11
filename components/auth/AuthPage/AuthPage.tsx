"use client";

import {
  Eye,
  EyeOff,
  Gamepad2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

import styles from "./AuthPage.module.css";

type AuthView =
  | "login"
  | "register"
  | "forgot"
  | "verify";

interface MessageState {
  type: "success" | "error";
  text: string;
}

export function AuthPage() {
  const [view, setView] =
    useState<AuthView>("login");

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [rememberMe, setRememberMe] =
    useState(true);

  const [acceptTerms, setAcceptTerms] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState | null>(null);

  const supabase = createClient();

  function changeView(nextView: AuthView): void {
    setView(nextView);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  function validateRegistration(): string | null {
    if (fullName.trim().length < 3) {
      return "اكتبي الاسم كاملًا بشكل صحيح.";
    }

    if (!email.trim()) {
      return "اكتبي البريد الإلكتروني.";
    }

    if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
      return "اكتبي رقم واتساب مصري صحيح مكوّن من 11 رقمًا.";
    }

    if (password.length < 8) {
      return "كلمة المرور لازم تكون 8 أحرف على الأقل.";
    }

    if (password !== confirmPassword) {
      return "كلمتا المرور غير متطابقتين.";
    }

    if (!acceptTerms) {
      return "يجب الموافقة على الشروط وسياسة الخصوصية.";
    }

    return null;
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setMessage(null);

    const validationError =
      validateRegistration();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo =
        `${window.location.origin}/auth/callback?next=/account`;

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo,
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

      if (error) {
        setMessage({
          type: "error",
          text:
            error.message ===
            "User already registered"
              ? "البريد الإلكتروني مستخدم بالفعل."
              : error.message,
        });

        return;
      }

      if (!data.user) {
        setMessage({
          type: "error",
          text: "تعذر إنشاء الحساب. حاولي مرة أخرى.",
        });

        return;
      }

      setView("verify");

      setMessage({
        type: "success",
        text:
          "تم إنشاء الحساب وإرسال رسالة تأكيد إلى بريدك.",
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "حدث خطأ أثناء إنشاء الحساب. تأكدي من الاتصال وحاولي مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage({
        type: "error",
        text:
          "اكتبي البريد الإلكتروني وكلمة المرور.",
      });

      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (error) {
        setMessage({
          type: "error",
          text:
            error.message ===
            "Invalid login credentials"
              ? "البريد أو كلمة المرور غير صحيحة."
              : error.message,
        });

        return;
      }

      if (!data.user) {
        setMessage({
          type: "error",
          text: "تعذر تسجيل الدخول.",
        });

        return;
      }

      /*
       * Supabase يحفظ جلسة المستخدم تلقائيًا.
       * rememberMe سيُستخدم لاحقًا لضبط سياسة
       * مدة الجلسة والأجهزة من إعدادات النظام.
       */
      localStorage.setItem(
        "devplay-remember-me",
        String(rememberMe),
      );

      window.location.href = "/account";
    } catch {
      setMessage({
        type: "error",
        text:
          "حدث خطأ أثناء تسجيل الدخول.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({
        type: "error",
        text: "اكتبي البريد الإلكتروني أولًا.",
      });

      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/auth/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo,
          },
        );

      if (error) {
        setMessage({
          type: "error",
          text: error.message,
        });

        return;
      }

      setMessage({
        type: "success",
        text:
          "تم إرسال رابط استعادة كلمة المرور. تفقدي بريدك.",
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "تعذر إرسال رسالة الاستعادة حاليًا.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation(): Promise<void> {
    if (!email.trim()) {
      setMessage({
        type: "error",
        text:
          "اكتبي بريدك ثم أعيدي المحاولة.",
      });

      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo:
          `${window.location.origin}/auth/callback?next=/account`,
      },
    });

    setLoading(false);

    setMessage({
      type: error ? "error" : "success",
      text: error
        ? error.message
        : "تم إرسال رسالة تأكيد جديدة.",
    });
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <a
          className={styles.brand}
          href="/"
          aria-label="DevPlay Top Up"
        >
          <span>
            <Gamepad2 size={24} />
          </span>

          <div>
            <strong>DevPlay Top Up</strong>
            <small>BY SHAH​​D ELBARY</small>
          </div>
        </a>

        {view === "login" && (
          <>
            <div className={styles.heading}>
              <span>مرحبًا برجوعك</span>
              <h1>تسجيل الدخول</h1>

              <p>
                ادخلي حسابك لمتابعة الرصيد
                والطلبات والكوبونات.
              </p>
            </div>

            <form
              className={styles.form}
              onSubmit={handleLogin}
            >
              <label className={styles.field}>
                <span>البريد الإلكتروني</span>

                <div>
                  <Mail size={18} />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="example@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>كلمة المرور</span>

                <div>
                  <LockKeyhole size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    aria-label="إظهار كلمة المرور"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <div className={styles.options}>
                <label>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked,
                      )
                    }
                  />

                  <span>تذكرني</span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    changeView("forgot")
                  }
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {message && (
                <div
                  className={`${styles.message} ${
                    styles[message.type]
                  }`}
                  role="alert"
                >
                  {message.text}
                </div>
              )}

              <Button
                fullWidth
                size="large"
                type="submit"
                loading={loading}
              >
                تسجيل الدخول
              </Button>
            </form>

            <p className={styles.switchText}>
              ليس لديك حساب؟

              <button
                type="button"
                onClick={() =>
                  changeView("register")
                }
              >
                إنشاء حساب
              </button>
            </p>
          </>
        )}

        {view === "register" && (
          <>
            <div className={styles.heading}>
              <span>حساب جديد</span>
              <h1>إنشاء حساب</h1>

              <p>
                أنشئي حسابًا لحفظ محفظتك
                وطلباتك ومكافآتك.
              </p>
            </div>

            <form
              className={styles.form}
              onSubmit={handleRegister}
            >
              <label className={styles.field}>
                <span>الاسم الكامل</span>

                <div>
                  <UserRound size={18} />

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value,
                      )
                    }
                    placeholder="اكتبي اسمك"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>البريد الإلكتروني</span>

                <div>
                  <Mail size={18} />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="example@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>رقم واتساب</span>

                <div>
                  <Phone size={18} />

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11),
                      )
                    }
                    placeholder="01012345678"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>كلمة المرور</span>

                <div>
                  <LockKeyhole size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="8 أحرف على الأقل"
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    aria-label="إظهار كلمة المرور"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <label className={styles.field}>
                <span>تأكيد كلمة المرور</span>

                <div>
                  <KeyRound size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="أعيدي كتابة كلمة المرور"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              <label className={styles.terms}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) =>
                    setAcceptTerms(
                      event.target.checked,
                    )
                  }
                />

                <span>
                  أوافق على الشروط وسياسة
                  الخصوصية والاسترجاع.
                </span>
              </label>

              {message && (
                <div
                  className={`${styles.message} ${
                    styles[message.type]
                  }`}
                  role="alert"
                >
                  {message.text}
                </div>
              )}

              <Button
                fullWidth
                size="large"
                type="submit"
                loading={loading}
              >
                إنشاء الحساب
              </Button>
            </form>

            <p className={styles.switchText}>
              لديك حساب بالفعل؟

              <button
                type="button"
                onClick={() =>
                  changeView("login")
                }
              >
                تسجيل الدخول
              </button>
            </p>
          </>
        )}

        {view === "forgot" && (
          <>
            <div className={styles.heading}>
              <span>استعادة الحساب</span>
              <h1>نسيت كلمة المرور؟</h1>

              <p>
                اكتبي بريدك وهنبعتلك رابط
                آمن لتعيين كلمة مرور جديدة.
              </p>
            </div>

            <form
              className={styles.form}
              onSubmit={handleForgotPassword}
            >
              <label className={styles.field}>
                <span>البريد الإلكتروني</span>

                <div>
                  <Mail size={18} />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="example@email.com"
                    required
                  />
                </div>
              </label>

              {message && (
                <div
                  className={`${styles.message} ${
                    styles[message.type]
                  }`}
                  role="alert"
                >
                  {message.text}
                </div>
              )}

              <Button
                fullWidth
                size="large"
                type="submit"
                loading={loading}
              >
                إرسال رابط الاستعادة
              </Button>

              <Button
                fullWidth
                variant="ghost"
                onClick={() =>
                  changeView("login")
                }
              >
                الرجوع لتسجيل الدخول
              </Button>
            </form>
          </>
        )}

        {view === "verify" && (
          <section className={styles.verify}>
            <span className={styles.verifyIcon}>
              <Mail size={30} />
            </span>

            <h1>تحققي من بريدك</h1>

            <p>
              أرسلنا رسالة تأكيد إلى:
              <strong>{email}</strong>
            </p>

            {message && (
              <div
                className={`${styles.message} ${
                  styles[message.type]
                }`}
                role="status"
              >
                {message.text}
              </div>
            )}

            <a
              className={styles.mailButton}
              href="https://mail.google.com"
              target="_blank"
              rel="noreferrer"
            >
              فتح صندوق البريد
            </a>

            <Button
              fullWidth
              variant="outline"
              onClick={resendConfirmation}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} />
                  جاري الإرسال
                </>
              ) : (
                "إعادة إرسال الرسالة"
              )}
            </Button>

            <Button
              fullWidth
              variant="ghost"
              onClick={() =>
                changeView("login")
              }
            >
              الرجوع لتسجيل الدخول
            </Button>
          </section>
        )}
      </section>
    </main>
  );
}