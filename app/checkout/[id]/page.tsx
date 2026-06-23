"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Gamepad2,
  ImageUp,
  Info,
  Mail,
  User,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { playSound } from "@/lib/playSound";

type Product = {
  id: number;
  game: string | null;
  name: string | null;
  price_sell: number | null;
  need: string | null;
  delivery_type: string | null;
};

const steps = ["الباقة", "بيانات الشحن", "الدفع", "مراجعة"];
const PAYMENT_BUCKET = "payment-proofs";

function normalizeEgyptPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return `+20${digits}`;
}

function displayLocalPhone(value: string) {
  return value.replace(/\D/g, "");
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);

  const [step, setStep] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [contactValue, setContactValue] = useState("");

  const [senderPhone, setSenderPhone] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentImage, setPaymentImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const progress = ((step + 1) / steps.length) * 100;
  const normalizedCustomerPhone = normalizeEgyptPhone(customerPhone);
  const normalizedSenderPhone = normalizeEgyptPhone(senderPhone);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (user) {
        setIsLoggedIn(true);
        setCustomerEmail(user.email || "");
        setCustomerName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
        );

        const metaPhone = user.user_metadata?.phone || "";
        if (metaPhone) setCustomerPhone(displayLocalPhone(metaPhone));
      }

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      setProduct(data);
      setLoading(false);
    }

    if (productId) loadData();
  }, [productId]);

  function phoneInput(
    value: string,
    onChange: (value: string) => void,
    placeholder = "1012345678"
  ) {
    return (
      <div className="phone-input-wrap">
        <div className="country-code">
          <span>مصر</span>
          <strong>+20</strong>
        </div>

        <input
          type="tel"
          placeholder={placeholder}
          value={displayLocalPhone(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  function needFields() {
    const need = product?.need;

    if (need === "player_id_region") {
      return (
        <>
          <input
            placeholder="Player ID"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          />

          <input
            placeholder="Server / Region ID"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
          />
        </>
      );
    }

    if (need === "ea_account_link") {
      return (
        <>
          <input
            placeholder="EA Account Link"
            value={accountLink}
            onChange={(e) => setAccountLink(e.target.value)}
          />

          <input
            placeholder="رقم واتساب للتواصل"
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
          />
        </>
      );
    }

    if (need === "phone") {
      return (
        <input
          placeholder="رقم الهاتف المطلوب شحنه"
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
        />
      );
    }

    if (need === "contact_or_email") {
      return (
        <input
          placeholder="البريد الإلكتروني أو رقم التواصل"
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
        />
      );
    }

    return (
      <input
        placeholder="Player ID"
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
      />
    );
  }

  function validatePhone(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10;
  }

  function validateStep() {
    setErrorMsg("");

    if (step === 1) {
      if (!customerName.trim()) return setErrorMsg("اكتب اسمك.");
      if (!validatePhone(customerPhone)) return setErrorMsg("اكتب رقم تواصل صحيح.");
      if (!validateEmail(customerEmail)) return setErrorMsg("اكتب بريد إلكتروني صحيح عشان نقدر نبعتلك تحديثات الطلب.");

      if (product?.need === "player_id" && !playerId.trim()) {
        return setErrorMsg("اكتب Player ID.");
      }

      if (
        product?.need === "player_id_region" &&
        (!playerId.trim() || !serverId.trim())
      ) {
        return setErrorMsg("اكتب Player ID و Region ID.");
      }

      if (
        product?.need === "ea_account_link" &&
        (!accountLink.trim() || !contactValue.trim())
      ) {
        return setErrorMsg("اكتب رابط الحساب ورقم واتساب.");
      }

      if (
        (product?.need === "phone" || product?.need === "contact_or_email") &&
        !contactValue.trim()
      ) {
        return setErrorMsg("اكتب البيانات المطلوبة.");
      }
    }

    if (step === 2) {
      if (!validatePhone(senderPhone)) {
        return setErrorMsg("اكتب الرقم المحوّل منه بشكل صحيح.");
      }

      if (!paymentReference.trim()) {
        return setErrorMsg("اكتب رقم العملية أو ملاحظة التحويل.");
      }

      if (!paymentImage) {
        return setErrorMsg("ارفع صورة التحويل لتأكيد الطلب.");
      }
    }

    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function getOrderData() {
    return JSON.stringify({
      need: product?.need,
      player_id: playerId,
      server_id: serverId,
      account_link: accountLink,
      contact: contactValue,
      sender_phone: normalizedSenderPhone,
    });
  }

  async function submitOrder() {
    if (!product) return;

    setSubmitting(true);
    setErrorMsg("");

    if (!paymentImage) {
      setSubmitting(false);
      playSound("error");
      setErrorMsg("صورة التحويل مطلوبة.");
      return;
    }

    let paymentImageUrl = "";

    const fileExt = paymentImage.name.split(".").pop();
    const fileName = `proof-${Date.now()}.${fileExt}`;
    const filePath = `orders/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(PAYMENT_BUCKET)
      .upload(filePath, paymentImage, {
        cacheControl: "3600",
        upsert: false,
        contentType: paymentImage.type,
      });

    if (uploadError) {
      setSubmitting(false);
      playSound("error");
      setErrorMsg(`فشل رفع صورة التحويل: ${uploadError.message}`);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(PAYMENT_BUCKET)
      .getPublicUrl(filePath);

    paymentImageUrl = publicUrlData.publicUrl;

    const { data: orderData, error } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_phone: normalizedCustomerPhone,
        customer_email: customerEmail.trim().toLowerCase(),
        product_name: `${product.game} - ${product.name}`,
        quantity: 1,
        total_price: product.price_sell,
        order_data: getOrderData(),
        status: "Waiting Payment",
        delivery_type: product.delivery_type,
        payment_method: "Vodafone Cash",
        payment_reference: `From: ${normalizedSenderPhone} | Ref: ${paymentReference}`,
        payment_image: paymentImageUrl,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error) {
      playSound("error");
      setErrorMsg(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      title: `تم استلام طلبك #${orderData.id}`,
      message: "تم استلام طلبك بنجاح وسيتم مراجعة الدفع وتنفيذ الطلب يدويًا.",
      type: "order",
      order_id: orderData.id,
      customer_phone: normalizedCustomerPhone,
    });

    playSound("success");
    router.push(`/order-success?id=${orderData.id}`);
  }

  if (loading) {
    return (
      <main className="container">
        <div className="game-loading skeleton" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container">
        <div className="glass-card game-empty">
          <h1>الباقة غير موجودة</h1>
          <Link href="/" className="btn">
            الرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <section className="checkout-card glass-card neon-border">
        <div className="auth-brand">
          <div className="icon-btn pulse-glow">
            <Gamepad2 size={24} />
          </div>

          <div>
            <h1 className="neon-text">إتمام الطلب</h1>
            <p>
              {product.game} - {product.name}
            </p>
          </div>
        </div>

        {!isLoggedIn && (
          <div className="guest-checkout-alert">
            <Info size={20} />
            <div>
              <strong>نصيحة مهمة قبل إتمام الطلب</strong>
              <p>
                يمكنك إكمال الطلب كضيف، لكن إنشاء حساب يساعدك على حفظ طلباتك ومتابعتها لاحقًا بسهولة.
              </p>
              <div>
                <Link href="/auth/login">تسجيل الدخول</Link>
                <Link href="/auth/register">إنشاء حساب</Link>
              </div>
            </div>
          </div>
        )}

        <div className="auth-progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="auth-steps">
          {steps.map((item, index) => (
            <div
              key={item}
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
            transition={{ duration: 0.25 }}
            className="auth-step-content"
          >
            {step === 0 && (
              <>
                <span className="badge">
                  <BadgeCheck size={14} />
                  الباقة
                </span>

                <h2>{product.name}</h2>
                <p>{product.game}</p>

                <div className="checkout-price">
                  <span>الإجمالي</span>
                  <strong>{product.price_sell} ج</strong>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <span className="badge">
                  <User size={14} />
                  بيانات الشحن
                </span>

                <h2>بيانات العميل</h2>

                <input
                  placeholder="اسمك"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />

                {phoneInput(customerPhone, setCustomerPhone)}

                <div className="email-field-wrap">
                  <Mail size={17} />
                  <input
                    placeholder="البريد الإلكتروني لاستلام تحديثات الطلب"
                    value={customerEmail}
                    disabled={isLoggedIn}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                {needFields()}
              </>
            )}

            {step === 2 && (
              <>
                <span className="badge">
                  <Wallet size={14} />
                  الدفع اليدوي
                </span>

                <h2>Vodafone Cash</h2>

                <div className="payment-box">
                  <CreditCard size={24} />

                  <div>
                    <span>حوّل المبلغ على</span>
                    <strong>01035966569</strong>
                  </div>
                </div>

                {phoneInput(senderPhone, setSenderPhone)}

                <input
                  placeholder="رقم العملية أو ملاحظة التحويل"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />

                <label className="upload-box">
                  <ImageUp size={22} />
                  <span>
                    {paymentImage
                      ? paymentImage.name
                      : "ارفع صورة التحويل إجباريًا"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => setPaymentImage(e.target.files?.[0] || null)}
                  />
                </label>
              </>
            )}

            {step === 3 && (
              <>
                <span className="badge">
                  <CheckCircle2 size={14} />
                  مراجعة
                </span>

                <h2>راجع الطلب</h2>

                <div className="auth-review">
                  <div>
                    <span>المنتج</span>
                    <strong>
                      {product.game} - {product.name}
                    </strong>
                  </div>

                  <div>
                    <span>السعر</span>
                    <strong>{product.price_sell} ج</strong>
                  </div>

                  <div>
                    <span>الاسم</span>
                    <strong>{customerName}</strong>
                  </div>

                  <div>
                    <span>رقم التواصل</span>
                    <strong>{normalizedCustomerPhone}</strong>
                  </div>

                  <div>
                    <span>البريد</span>
                    <strong>{customerEmail}</strong>
                  </div>

                  <div>
                    <span>الدفع</span>
                    <strong>Vodafone Cash - 01035966569</strong>
                  </div>
                </div>
              </>
            )}

            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            <div className="auth-actions">
              {step > 0 && (
                <button className="auth-back" onClick={() => setStep((s) => s - 1)}>
                  <ArrowRight size={17} />
                  رجوع
                </button>
              )}

              {step < steps.length - 1 ? (
                <button className="btn" onClick={validateStep}>
                  التالي
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <button className="btn" onClick={submitOrder} disabled={submitting}>
                  {submitting ? "جاري إرسال الطلب..." : "تأكيد الطلب"}
                  <CheckCircle2 size={18} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}