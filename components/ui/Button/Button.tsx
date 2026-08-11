import type { ButtonProps } from "./Button.types";
import styles from "./Button.module.css";

function joinClasses(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  type = "button",
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={joinClasses(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
      )}
    >
      {loading ? (
        <>
          <span
            className={styles.spinner}
            aria-hidden="true"
          />

          <span>جاري التحميل...</span>
        </>
      ) : (
        <>
          {rightIcon && (
            <span className={styles.icon}>
              {rightIcon}
            </span>
          )}

          {children && (
            <span className={styles.label}>
              {children}
            </span>
          )}

          {leftIcon && (
            <span className={styles.icon}>
              {leftIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}