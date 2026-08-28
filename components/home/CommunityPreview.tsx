import {
  Gift,
  Heart,
  LockKeyhole,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

import styles from "./CommunityPreview.module.css";

const features = [
  {
    icon: UserPlus,
    title: "إضافة الأصدقاء",
    description: "مكان واحد للتواصل مع أصدقائك داخل تجربة DevPlay.",
  },
  {
    icon: Gift,
    title: "إرسال الهدايا",
    description: "اختيار هدية رقمية وإرسالها لصديقك بسهولة.",
  },
  {
    icon: Heart,
    title: "Wishlist",
    description: "قائمة أمنيات تحفظ ما يعجبك وتسهّل مشاركته لاحقًا.",
  },
];

export function CommunityPreview() {
  return (
    <section className={styles.section} aria-labelledby="community-preview-title">
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}><Sparkles /> SOCIAL PREVIEW</span>
          <h2 id="community-preview-title">مجتمع DevPlay — قريبًا</h2>
          <p>
            مساحة اجتماعية جديدة نجهّزها لتجعل اللعب والهدايا والاختيارات المشتركة
            أقرب، مع بقاء حسابك وتجربة المتجر في مكان واحد.
          </p>
        </div>
        <span className={styles.badge}><LockKeyhole /> معاينة فقط</span>
      </header>

      <div className={styles.stage}>
        <div className={styles.companion} aria-hidden="true">
          <span className={styles.antenna}><i /></span>
          <span className={styles.face}><i /><i /><b /></span>
          <span className={styles.body}><UsersRound /></span>
          <span className={styles.shadow} />
        </div>

        <div className={styles.features}>
          {features.map(({ icon: Icon, title, description }, index) => (
            <article key={title} style={{ "--feature-index": index } as React.CSSProperties}>
              <span><Icon /></span>
              <div><strong>{title}</strong><p>{description}</p></div>
              <small>قريبًا</small>
            </article>
          ))}
        </div>
      </div>

      <footer>
        <span><UsersRound /> صديق DevPlay سيكون جزءًا من رحلتك الاجتماعية</span>
        <p>هذه معاينة تصميمية فقط؛ لا توجد بيانات مستخدمين أو وظائف اجتماعية مفعّلة حاليًا.</p>
      </footer>
    </section>
  );
}
