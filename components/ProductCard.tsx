"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2 } from "lucide-react";

type Props = {
  title: string;
  image: string;
};

export default function ProductCard({
  title,
  image,
}: Props) {
  return (
    <motion.div
      whileHover={{
        y: -10,
        scale: 1.03,
      }}
      transition={{
        duration: 0.25,
      }}
      className="glass-card hover-lift"
      style={{
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 180,
          overflow: "hidden",
        }}
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width:768px) 50vw, 20vw"
          style={{
            objectFit: "cover",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(7,11,22,.95), transparent 60%)",
          }}
        />

        <div
          className="badge"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <Gamepad2 size={13} />
          Top Up
        </div>
      </div>

      <div
        style={{
          padding: 16,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          {title}
        </h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#9ca3af",
          }}
        >
          <span>عرض المنتجات</span>

          <ArrowLeft size={18} />
        </div>
      </div>
    </motion.div>
  );
}