export type SoundType = "success" | "error" | "notify" | "click";

export function playSound(type: SoundType) {
  if (typeof window === "undefined") return;

  const audio = new Audio(`/sounds/${type}.mp3`);
  audio.volume = 0.55;

  audio.play().catch(() => {
    // بعض المتصفحات تمنع الصوت قبل أول تفاعل من المستخدم
  });
}