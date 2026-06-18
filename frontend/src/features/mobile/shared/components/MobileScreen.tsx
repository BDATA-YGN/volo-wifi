import styles from "./mobile.module.css";

interface MobileScreenProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Standard content wrapper for mobile feature screens. */
export default function MobileScreen({ title, description, children }: MobileScreenProps) {
  return (
    <section className={styles.screen}>
      <h2 className={styles.screenTitle}>{title}</h2>
      {description ? <p className={styles.screenDesc}>{description}</p> : null}
      {children ?? (
        <div className={styles.placeholder}>
          Screen scaffold — connect to mobile v1 API next.
        </div>
      )}
    </section>
  );
}
