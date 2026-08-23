"use client";

import { useEffect } from "react";

const INVALID_PROVIDER_VALUES = new Set([
  "code-title",
  "delivered-section",
  "instant-delivery",
]);

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanDeliveredCodes() {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[aria-label="نسخ الكود"]'),
  );
  const seen = new Set<string>();

  for (const button of buttons) {
    const row = button.parentElement;
    const code = row?.querySelector("code");
    if (!row || !code) continue;

    const value = normalize(code.textContent ?? "");
    const key = value.toLowerCase();
    const invalid =
      !value ||
      INVALID_PROVIDER_VALUES.has(key) ||
      value.includes("<") ||
      value.includes(">");

    if (invalid || seen.has(key)) {
      row.hidden = true;
      row.setAttribute("aria-hidden", "true");
      continue;
    }

    seen.add(key);
    row.hidden = false;
    row.removeAttribute("aria-hidden");
    row.dataset.activationCode = "true";

    if (!row.querySelector('[data-code-label="true"]')) {
      const label = document.createElement("span");
      label.dataset.codeLabel = "true";
      label.textContent = "كود التفعيل";
      label.style.cssText =
        "font-size:10px;font-weight:800;color:var(--success);white-space:nowrap";
      row.insertBefore(label, code);
    }
  }
}

export function DeliveredCodeGuard() {
  useEffect(() => {
    cleanDeliveredCodes();
    const observer = new MutationObserver(cleanDeliveredCodes);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
