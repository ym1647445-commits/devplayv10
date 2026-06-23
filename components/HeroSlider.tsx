"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, ShieldCheck, Sparkles, WalletCards, Zap } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

const slides = [
  {
    title: "اشحن ألعابك خلال ثواني",
    subtitle: "PUBG Mobile • Free Fire • FC Mobile • Steam",
    badge: "الأكثر طلبًا",
    image: "/assets/heroes/topuphero.png",
  },
  {
    title: "عروض قوية على الألعاب",
    subtitle: "باقات يومية وأسعار قابلة للتحديث من لوحة الأدمن",
    badge: "عروض اليوم",
    image: "/assets/heroes/offerhero.png",
  },
  {
    title: "بطاقات رقمية وكروت Steam",
    subtitle: "Steam USD • Anghami Plus • Codes Manual Delivery",
    badge: "Digital Codes",
    image: "/assets/heroes/steamhero.png",
  },
  {
  title: "دعم فني سريع 24/7",
  subtitle: "متابعة الطلبات والرد على البلاغات والاقتراحات بسرعة",
  badge: "دعم فني",
  image: "/assets/heroes/supporthero.png",
},
];

export default function HeroSlider() {
  return (
    <section className="hero-shell">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 4200, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="hero-swiper"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.title}>
            <div className="hero-slide">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority
                sizes="100vw"
                className="hero-image"
              />

              <div className="hero-overlay" />

              <div className="hero-content">
                <motion.div
                  initial={{ opacity: 0, y: 34 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className="hero-copy"
                >
                  <span className="badge">
                    <Sparkles size={15} />
                    {slide.badge}
                  </span>

                  <h2>{slide.title}</h2>

                  <p>{slide.subtitle}</p>

                  <div className="hero-actions">
                    <Link href="/products" className="hero-primary">
                      ابدأ الآن
                      <ArrowLeft size={18} />
                    </Link>

                    <Link href="/products" className="hero-secondary">
  تصفح الألعاب
</Link>
                  </div>
                </motion.div>

                <div className="hero-floating">
                  <motion.div
                    className="float-card"
                    animate={{ y: [0, -14, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Gamepad2 />
                    <div>
                      <strong>PUBG UC</strong>
                      <span>Instant Request</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="float-card"
                    animate={{ y: [0, 16, 0] }}
                    transition={{ duration: 3.6, repeat: Infinity }}
                  >
                    <WalletCards />
                    <div>
                      <strong>Steam USD</strong>
                      <span>Code Delivery</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="float-card"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity }}
                  >
                    <ShieldCheck />
                    <div>
                      <strong>Manual Safe</strong>
                      <span>Admin Review</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="hero-orb"
                    animate={{ scale: [1, 1.12, 1], opacity: [.55, 1, .55] }}
                    transition={{ duration: 3.2, repeat: Infinity }}
                  >
                    <Zap size={52} />
                  </motion.div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}