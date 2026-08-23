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
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { loginWithPassword } from "@/app/auth/actions";
import {
  queueVisualAssistant,
  showVisualAssistant,
} from "@/components/assistant/visualAssistantEvents";
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
      showVisualAssistant({
        mood: "confused",
        text: validationError,
        duration: 8000,
        priority: 3,
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
      showVisualAssistant({
        mood: "celebrate",
        text: "الحساب اتعمل بنجاح! افتحي بريدك واضغطي رابط التأكيد عشان نكمّل.",
        duration: 10000,
        priority: 4,
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
      showVisualAssistant({
        mood: "confused",
        text: "اكتبي البريد الإلكتروني وكلمة المرور، وبعدها جرّبي تاني.",
        duration: 7500,
        priority: 3,
      });

      return;
    }

    setLoading(true);

    try {
      const result = await loginWithPassword(
        email,
        password,
      );

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.message,
        });
        showVisualAssistant({
          mood: "sympathy",
          text: result.message,
          duration: 8500,
          priority: 3,
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
      showVisualAssistant({
        mood: "celebrate",
        text: "تم تسجيل الدخول بنجاح! بنجهّز حسابك دلوقتي.",
        duration: 5000,
        priority: 4,
      });
      queueVisualAssistant({
        mood: "celebrate",
        text: "نورتِ DevPlay! تسجيل الدخول تم بنجاح—يلا نبدأ 🎉",
        duration: 9000,
        priority: 7,
        spotlight: true,
      });

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const safeNextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/account";
      window.location.href = safeNextPath;
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
        `${window.location.origin}/auth/callback?next=/auth/reset-password`;

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
        <Link
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
        </Link>

        {(view === "login" || view === "register") && (
          <>
            <div className={styles.authTabs} role="tablist" aria-label="اختيار طريقة الدخول">
              <button type="button" role="tab" aria-selected={view === "login"} className={view === "login" ? styles.activeTab : ""} onClick={() => changeView("login")}>تسجيل الدخول</button>
              <button type="button" role="tab" aria-selected={view === "register"} className={view === "register" ? styles.activeTab : ""} onClick={() => changeView("register")}>حساب جديد</button>
            </div>
            <a className={styles.googleButton} href="/auth/google"><b aria-hidden="true">G</b><span>المتابعة باستخدام Google</span><small>دخول سريع وآمن</small></a>
            <div className={styles.divider}><span>أو باستخدام البريد الإلكتروني</span></div>
          </>
        )}
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
                وطلباتك وكوبوناتك.
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
