import styles from "./loading.module.css";

export default function Loading(){return <div className={styles.screen} role="status" aria-label="جاري تحميل DevPlay"><div className={styles.logo}><span>Dev</span><span>Play</span></div><div className={styles.track}><i/></div><small>BY SHAHD ELBARY</small></div>}
