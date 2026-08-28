import Image from "next/image";

import styles from "./CinematicIntro.module.css";

export interface OrbitProduct {
  id: string;
  name: string;
  image: string;
}

export function GameOrbit({ products }: { products: OrbitProduct[] }) {
  const count = Math.max(1, products.length);

  return (
    <div className={styles.orbitStage}>
      <span className={styles.orbitLine} aria-hidden="true" />
      <div className={styles.orbit} aria-label={`منتجات DevPlay المتاحة: ${products.map((product) => product.name).join("، ")}`}>
        {products.map((product, index) => {
          return (
            <span
              className={styles.game}
              key={product.id}
              title={product.name}
              style={{
                "--game-angle": `${(index / count) * 360}deg`,
                "--game-index": index % 7,
              } as React.CSSProperties}
            >
              <span>
                <Image
                  src={product.image}
                  alt={product.name}
                  width={112}
                  height={112}
                  loading={index < 8 ? "eager" : "lazy"}
                  unoptimized
                />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
