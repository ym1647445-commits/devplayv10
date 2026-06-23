"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";


const steps = [
  {
    title: "البريد الإلكتروني",
    desc: "اكتب البريد المرتبط بحسابك في DevPlay.",
  },
  {
    title: "كلمة المرور",
    desc: "أدخل كلمة المرور لإكمال تسجيل الدخول.",
  },
  {
    title: "تأكيد الدخول",
    desc: "راجع بياناتك ثم ادخل إلى حسابك.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const progress = ((step + 1) / steps.length) * 100;

  function nextStep() {
    setErrorMsg("");

    if (step === 0 && !email.trim()) {
      setErrorMsg("اكتب البريد الإلكتروني أولًا.");
      return;
    }

    if (step === 0 && !email.includes("@")) {
      setErrorMsg("البريد الإلكتروني غير صحيح.");
      return;
    }

    if (step === 1 && password.length < 6) {
      setErrorMsg("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function prevStep() {
    setErrorMsg("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function login() {
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg("البريد أو كلمة المرور غير صحيح.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-panel glass-card neon-border">
        <div className="auth-brand">
          <div className="icon-btn pulse-glow">
            <Gamepad2 size={24} />
          </div>

          <div>
            <h1 className="neon-text">DevPlay Studio</h1>
            <p>تسجيل دخول آمن لحسابك</p>
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
              {index + 1}
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

            {step === 1 && (
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

            {step === 2 && (
              <div className="auth-review">
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
                  onClick={login}
                  disabled={loading}
                >
                  {loading ? "جاري الدخول..." : "دخول الحساب"}
                  <ShieldCheck size={18} />
                </button>
              )}
            </div>

            <div className="auth-switch">
              ليس لديك حساب؟
              <Link href="/auth/register">
                <UserPlus size={15} />
                إنشاء حساب جديد
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
          <Gamepad2 />
          <div>
            <strong>Gaming Top-Up</strong>
            <span>PUBG • FC • Steam</span>
          </div>
        </motion.div>

        <motion.div
          className="auth-float-card card-two"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 3.6, repeat: Infinity }}
        >
          <ShieldCheck />
          <div>
            <strong>Safe Orders</strong>
            <span>Manual Review</span>
          </div>
        </motion.div>

        <motion.div
          className="auth-float-card card-three"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 2.9, repeat: Infinity }}
        >
          <Sparkles />
          <div>
            <strong>Fast Delivery</strong>
            <span>Admin Processing</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}