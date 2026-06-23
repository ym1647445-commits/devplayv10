"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";

const steps = [
  {
    title: "اسمك",
    desc: "اكتب اسمك كما تريد أن يظهر داخل DevPlay.",
  },
  {
    title: "رقم الهاتف",
    desc: "اكتب رقم تواصل صحيح لمتابعة الطلبات.",
  },
  {
    title: "البريد الإلكتروني",
    desc: "البريد سيُستخدم لتسجيل الدخول ومتابعة الطلبات.",
  },
  {
    title: "كلمة المرور",
    desc: "اختر كلمة مرور قوية لحماية حسابك.",
  },
  {
    title: "تأكيد الحساب",
    desc: "راجع بياناتك ثم أنشئ الحساب.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const progress = ((step + 1) / steps.length) * 100;

  function nextStep() {
    setErrorMsg("");

    if (step === 0 && fullName.trim().length < 3) {
      setErrorMsg("اكتب الاسم بشكل صحيح.");
      return;
    }

    if (step === 1 && phone.trim().length < 10) {
      setErrorMsg("اكتب رقم هاتف صحيح.");
      return;
    }

    if (step === 2 && !email.includes("@")) {
      setErrorMsg("البريد الإلكتروني غير صحيح.");
      return;
    }

    if (step === 3 && password.length < 6) {
      setErrorMsg("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function prevStep() {
    setErrorMsg("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function register() {
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/auth/login");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-panel glass-card neon-border">
        <div className="auth-brand">
          <div className="icon-btn pulse-glow">
            <User size={24} />
          </div>

          <div>
            <h1 className="neon-text">Create Account</h1>
            <p>أنشئ حسابك في DevPlay خلال خطوات بسيطة</p>
          </div>
        </div>

        <div className="auth-progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="auth-steps">
          {steps.map((item, index) => (
            <div
              key={item.title}
              className={index <= step ? "auth-step active" : "auth-step"}
            >
              {index < step ? <CheckCircle2 size={18} /> : index + 1}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 35 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -35 }}
            transition={{ duration: 0.28 }}
            className="auth-step-content"
          >
            <span className="badge">
              <Sparkles size={14} />
              Step {step + 1} / {steps.length}
            </span>

            <h2>{steps[step].title}</h2>
            <p>{steps[step].desc}</p>

            {step === 0 && (
              <label className="auth-field">
                <span>
                  <User size={16} />
                  الاسم
                </span>
                <input
                  type="text"
                  placeholder="مثال: Ahmed Mohamed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </label>
            )}

            {step === 1 && (
              <label className="auth-field">
                <span>
                  <Phone size={16} />
                  رقم الهاتف
                </span>
                <input
                  type="tel"
                  placeholder="010xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </label>
            )}

            {step === 2 && (
              <label className="auth-field">
                <span>
                  <Mail size={16} />
                  البريد الإلكتروني
                </span>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </label>
            )}

            {step === 3 && (
              <label className="auth-field">
                <span>
                  <LockKeyhole size={16} />
                  كلمة المرور
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </label>
            )}

            {step === 4 && (
              <div className="auth-review">
                <div>
                  <span>الاسم</span>
                  <strong>{fullName}</strong>
                </div>

                <div>
                  <span>الهاتف</span>
                  <strong>{phone}</strong>
                </div>

                <div>
                  <span>البريد الإلكتروني</span>
                  <strong>{email}</strong>
                </div>

                <div>
                  <span>الحماية</span>
                  <strong>Supabase Auth</strong>
                </div>
              </div>
            )}

            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            <div className="auth-actions">
              {step > 0 && (
                <button type="button" className="auth-back" onClick={prevStep}>
                  <ArrowRight size={17} />
                  رجوع
                </button>
              )}

              {step < steps.length - 1 ? (
                <button type="button" className="btn" onClick={nextStep}>
                  التالي
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={register}
                  disabled={loading}
                >
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
                  <ShieldCheck size={18} />
                </button>
              )}
            </div>

            <div className="auth-switch">
              لديك حساب بالفعل؟
              <Link href="/auth/login">
                <Gamepad2 size={15} />
                تسجيل الدخول
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="auth-art">
        <motion.div
          className="auth-orb"
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Zap size={58} />
        </motion.div>

        <motion.div
          className="auth-float-card card-one"
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 3.2, repeat: Infinity }}
        >
          <User />
          <div>
            <strong>New Account</strong>
            <span>Fast registration</span>
          </div>
        </motion.div>

        <motion.div
          className="auth-float-card card-two"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 3.6, repeat: Infinity }}
        >
          <ShieldCheck />
          <div>
            <strong>Secure Access</strong>
            <span>Protected by Auth</span>
          </div>
        </motion.div>

        <motion.div
          className="auth-float-card card-three"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 2.9, repeat: Infinity }}
        >
          <Sparkles />
          <div>
            <strong>Track Orders</strong>
            <span>From your profile</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}