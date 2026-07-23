"use client";

import VoloLogo from "@/features/mobile/shared/components/VoloLogo";
import styles from "./welcome.module.css";

export default function WelcomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden />
      <main className={styles.main}>
        <div className={styles.brand}>
          <VoloLogo variant="full" height={88} title="VOLO" className={styles.logo} />
        </div>
        <h1 className={styles.title}>Welcome to Volo</h1>
        <p className={styles.subtitle}>
          Reliable WiFi connectivity for every site — simple access, clear control.
        </p>
      </main>
      <footer className={styles.footer}>Powered by Volo WiFi</footer>
    </div>
  );
}
