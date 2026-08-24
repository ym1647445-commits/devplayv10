"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

import styles from "./VisualAssistant.module.css";
import { CompanionMenu, type TutorialId } from "./CompanionMenu";
import { CompanionSetup } from "./CompanionSetup";
import { RockPaperScissorsGame } from "./RockPaperScissorsGame";
import { DEFAULT_COMPANION_PREFERENCES, readCompanionPreferences, saveCompanionPreferences, subscribeToCompanionPreferences } from "./companionPreferences";
import { TicTacToeGame } from "./TicTacToeGame";
import {
  consumeQueuedVisualAssistant,
  readTrackedAssistantRequests,
  saveTrackedAssistantRequests,
  subscribeToVisualAssistant,
  type AssistantMessage,
  type AssistantMood,
} from "./visualAssistantEvents";

const PAGE_MESSAGES: Record<string, AssistantMessage> = {
  "/auth": { mood: "wave", text: "أهلًا! معندكيش حساب؟ اختاري «حساب جديد»، وأنا هكمل الخطوات معاكي ⚡", duration: 8500 },
  "/cart": { mood: "point", text: "راجعي الباقة وبيانات التنفيذ كويس قبل ما نكمل للطلب.", duration: 7000 },
  "/checkout": { mood: "wave", text: "آخر خطوة! السعر والباقة هيتراجعوا بأمان على السيرفر قبل الخصم.", duration: 7500 },
};

const ROAM_INTERVAL_MS = 18000;
const PLAY_INTERVAL_MS = 23000;
const WALK_DURATION_MS = 1900;
const SAFE_POSITION = { x: 0, y: 0 };

type PlayfulMood = AssistantMood | "sleep";
type RoamingState = typeof SAFE_POSITION & { direction: "left" | "right"; moving: boolean };
type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function motionIsReduced(): boolean {
  return document.documentElement.dataset.reduceMotion === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VisualAssistant() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState<AssistantMessage | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [typing, setTyping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [rpsOpen, setRpsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [savingCompanion, setSavingCompanion] = useState(false);
  const [companionReady, setCompanionReady] = useState(false);
  const [gameInvited, setGameInvited] = useState(false);
  const [playfulMood, setPlayfulMood] = useState<PlayfulMood>("idle");
  const [companion, setCompanion] = useState(DEFAULT_COMPANION_PREFERENCES);
  const [roaming, setRoaming] = useState<RoamingState>({ ...SAFE_POSITION, direction: "right", moving: false });
  const timerRef = useRef<number | null>(null);
  const walkTimerRef = useRef<number | null>(null);
  const moodTimerRef = useRef<number | null>(null);
  const teaseTimerRef = useRef<number | null>(null);
  const priorityRef = useRef(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const teasedElementRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const local = readCompanionPreferences();
    setCompanion(local);
    const unsubscribe = subscribeToCompanionPreferences(setCompanion);
    if (!loading) {
      if (!user) setCompanionReady(true);
      else void supabase.from("customer_companion_preferences").select("name,tone,theme,color,size,enabled,roaming_enabled,game_invites_enabled,onboarding_completed").eq("user_id",user.id).maybeSingle().then(({data,error})=>{
        if (!error && data) {
          const synced={name:data.name,tone:data.tone,theme:data.theme,color:data.color,size:data.size,enabled:data.enabled,roamingEnabled:data.roaming_enabled,gameInvitesEnabled:data.game_invites_enabled,onboardingCompleted:data.onboarding_completed} as typeof local;
          setCompanion(saveCompanionPreferences(synced));
        }
        setCompanionReady(true);
      });
    }
    return unsubscribe;
  }, [loading, supabase, user]);

  useEffect(()=>{if(companionReady&&user&&!companion.onboardingCompleted&&!pathname.startsWith("/admin"))setSetupOpen(true)},[companion.onboardingCompleted,companionReady,pathname,user]);

  const clearMoodTimer = useCallback(() => {
    if (moodTimerRef.current) window.clearTimeout(moodTimerRef.current);
  }, []);

  const showPlayfulMood = useCallback((mood: PlayfulMood, duration: number) => {
    clearMoodTimer();
    setPlayfulMood(mood);
    moodTimerRef.current = window.setTimeout(() => setPlayfulMood("idle"), duration);
  }, [clearMoodTimer]);

  const returnToSafePosition = useCallback(() => {
    if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
    setRoaming((current) => ({ ...current, ...SAFE_POSITION, direction: "right", moving: false }));
  }, []);

  const present = useCallback((next: AssistantMessage): void => {
    const priority = next.priority ?? 1;
    if (priority < priorityRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    priorityRef.current = priority;
    clearMoodTimer();
    setGameInvited(false);
    setPlayfulMood("idle");
    returnToSafePosition();
    setBubbleOpen(true);
    setMessage(next);
    timerRef.current = window.setTimeout(() => {
      setMessage(null);
      priorityRef.current = 0;
    }, next.duration ?? 6500);
  }, [clearMoodTimer, returnToSafePosition]);

  useEffect(() => subscribeToVisualAssistant(present), [present]);

  useEffect(() => {
    const queued = consumeQueuedVisualAssistant();
    if (queued) window.setTimeout(() => present(queued), 500);
  }, [present]);

  useEffect(() => {
    if (loading || pathname.startsWith("/admin")) return;
    if (sessionStorage.getItem("devplay:visual-assistant:welcomed")) return;
    sessionStorage.setItem("devplay:visual-assistant:welcomed", "true");
    const firstName = profile?.full_name?.trim().split(/\s+/)[0];
    const timer = window.setTimeout(() => present({
      mood: "wave",
      text: firstName
        ? `أهلًا يا ${firstName}! نورتِ DevPlay—أنا Dev وهفضل معاكي في الموقع 💜`
        : "أهلًا! نورتِ DevPlay—أنا Dev وهفضل معاكي في الموقع 💜",
      duration: 10000,
      priority: 4,
      hearts: true,
    }), 650);
    return () => window.clearTimeout(timer);
  }, [loading, pathname, present, profile?.full_name]);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;

    const checkTrackedRequests = async () => {
      const tracked = readTrackedAssistantRequests();
      if (!tracked.length) return;
      const deposits = tracked.filter((item) => item.type === "deposit");
      const orders = tracked.filter((item) => item.type === "order");
      const [depositResult, orderResult] = await Promise.all([
        deposits.length
          ? supabase.from("deposit_requests").select("id,status").in("id", deposits.map((item) => item.id))
          : Promise.resolve({ data: [], error: null }),
        orders.length
          ? supabase.from("product_orders").select("id,status").in("id", orders.map((item) => item.id))
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled || depositResult.error || orderResult.error) return;
      const statuses = new Map<string, string>();
      for (const row of [...(depositResult.data ?? []), ...(orderResult.data ?? [])]) statuses.set(row.id, row.status);
      let celebration: AssistantMessage | null = null;
      const remaining = tracked.flatMap((item) => {
        const status = statuses.get(item.id) ?? item.status;
        const terminal = item.type === "deposit"
          ? ["approved", "rejected"].includes(status)
          : ["completed", "failed", "cancelled", "refunded"].includes(status);
        if (item.type === "deposit" && status === "approved" && item.status !== "approved") {
          celebration ??= {
            mood: "celebrate",
            text: `أخيرًا تمت الموافقة على طلب إضافة الرصيد ${item.displayId}! يلا بينا نعمل طلبنا 🎉`,
            action: { label: "ابدأ طلبك", href: "/" },
            duration: 14000,
            priority: 9,
            spotlight: true,
          };
        }
        if (item.type === "order" && status === "completed" && item.status !== "completed") {
          celebration ??= {
            mood: "celebrate",
            text: `طلبنا ${item.displayId} اتنفّذ بنجاح! مبروك—يلا نشوف تفاصيله 🎊`,
            action: { label: "عرض الطلب", href: "/orders" },
            duration: 14000,
            priority: 9,
            spotlight: true,
          };
        }
        return terminal ? [] : [{ ...item, status }];
      });
      saveTrackedAssistantRequests(remaining);
      if (celebration) present(celebration);
    };

    void checkTrackedRequests();
    const interval = window.setInterval(() => void checkTrackedRequests(), 45000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loading, present, supabase, user]);

  useEffect(() => {
    if (!companion.gameInvitesEnabled || gameOpen || message || typing || pathname.startsWith("/admin")) return;
    let scrollCount = 0;
    let inviteTimer: number | null = null;
    const reset = () => {
      scrollCount = 0;
      if (inviteTimer) window.clearTimeout(inviteTimer);
      inviteTimer = null;
    };
    const invite = () => {
      if (sessionStorage.getItem("devplay:visual-assistant:game-invited")) return;
      sessionStorage.setItem("devplay:visual-assistant:game-invited", "true");
      present({
        mood: "wave",
        text: "إحنا بنلف في الموقع من شوية… تحبي نلعب جولة X و O؟ أنتِ ضد الروبوت 🤖",
        duration: 16000,
        priority: 2,
      });
      setGameInvited(true);
    };
    const handleScroll = () => {
      scrollCount += 1;
      if (scrollCount < 5 || inviteTimer) return;
      inviteTimer = window.setTimeout(invite, 22000);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
      if (inviteTimer) window.clearTimeout(inviteTimer);
    };
  }, [companion.gameInvitesEnabled, gameOpen, message, pathname, present, typing]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (motionIsReduced()) returnToSafePosition();
    });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPreference = () => {
      if (motionIsReduced()) returnToSafePosition();
    };
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
    media.addEventListener("change", handleMotionPreference);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", handleMotionPreference);
    };
  }, [returnToSafePosition]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.matches("input, textarea, [contenteditable='true']") || Boolean(target.closest("[contenteditable='true']"));
    };
    const handleFocusIn = (event: FocusEvent) => {
      const active = isTypingTarget(event.target);
      setTyping(active);
      if (active) returnToSafePosition();
    };
    const handleFocusOut = () => window.setTimeout(() => setTyping(isTypingTarget(document.activeElement)), 0);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [returnToSafePosition]);

  useEffect(() => {
    if (!companion.roamingEnabled || message || typing || dragging || gameOpen || pathname.startsWith("/admin")) return;
    const roam = () => {
      if (motionIsReduced()) return;
      const maxX = Math.max(0, Math.min(window.innerWidth * .38, 440) - 75);
      const maxY = Math.max(35, Math.min(window.innerHeight * .28, 210));
      setRoaming((current) => {
        const x = Math.round(Math.random() * maxX);
        const y = -Math.round(18 + Math.random() * (maxY - 18));
        return { x, y, direction: x < current.x ? "left" : "right", moving: true };
      });
      if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
      walkTimerRef.current = window.setTimeout(() => {
        setRoaming((current) => ({ ...current, moving: false }));
      }, WALK_DURATION_MS);
    };
    const interval = window.setInterval(roam, ROAM_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [companion.roamingEnabled, dragging, gameOpen, message, pathname, typing]);

  useEffect(() => {
    if (!companion.roamingEnabled || message || typing || dragging || gameOpen || pathname.startsWith("/admin")) return;
    const tease = () => {
      if (motionIsReduced() || !rootRef.current) return;
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"))
        .filter((element) => {
          if (element.closest("[data-visual-assistant-root]")) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 28 && rect.height > 24 && rect.top > 15 && rect.bottom < window.innerHeight - 15;
        });
      if (!candidates.length) return;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const targetRect = target.getBoundingClientRect();
      const rootRect = rootRef.current.getBoundingClientRect();
      setRoaming((current) => {
        const desiredLeft = Math.max(8, Math.min(window.innerWidth - 72, targetRect.left - 48));
        const desiredTop = Math.max(12, Math.min(window.innerHeight - 120, targetRect.top - 28));
        const x = Math.max(0, Math.min(window.innerWidth - 76, current.x + desiredLeft - rootRect.left));
        const y = Math.min(0, Math.max(-(window.innerHeight - 145), current.y + desiredTop - rootRect.top));
        return { x, y, direction: desiredLeft < rootRect.left ? "left" : "right", moving: true };
      });
      if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
      walkTimerRef.current = window.setTimeout(() => {
        setRoaming((current) => ({ ...current, moving: false }));
        target.dataset.assistantTeased = "true";
        teasedElementRef.current = target;
        showPlayfulMood("point", 1500);
        teaseTimerRef.current = window.setTimeout(() => {
          delete target.dataset.assistantTeased;
          teasedElementRef.current = null;
        }, 1500);
      }, WALK_DURATION_MS);
    };
    const firstTease = window.setTimeout(tease, 14000);
    const interval = window.setInterval(tease, 36000);
    return () => {
      window.clearTimeout(firstTease);
      window.clearInterval(interval);
    };
  }, [companion.roamingEnabled, dragging, gameOpen, message, pathname, showPlayfulMood, typing]);

  useEffect(() => {
    if (message || typing || dragging || gameOpen || pathname.startsWith("/admin")) return;
    const play = () => {
      if (motionIsReduced()) return;
      const moods: Array<[PlayfulMood, number]> = [
        ["sleep", 6000],
        ["celebrate", 1800],
        ["angry", 1200],
        ["wave", 1900],
      ];
      const [mood, duration] = moods[Math.floor(Math.random() * moods.length)];
      showPlayfulMood(mood, duration);
    };
    const interval = window.setInterval(play, PLAY_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [dragging, gameOpen, message, pathname, showPlayfulMood, typing]);

  useEffect(() => {
    if (loading || pathname.startsWith("/admin")) return;
    const timer = window.setTimeout(() => {
      if ((pathname === "/cart" || pathname === "/checkout") && !user) {
        present({
          mood: "point",
          text: "لحظة يا بطل ✋ لازم نسجّل دخول الأول عشان نحفظ طلبك ونتابعه معاكي.",
          action: { label: "تسجيل الدخول", href: `/auth?next=${encodeURIComponent(pathname)}` },
          duration: 10000,
          priority: 2,
        });
        return;
      }
      const pageMessage = PAGE_MESSAGES[pathname];
      if (pageMessage) present(pageMessage);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [loading, pathname, present, user]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
    if (moodTimerRef.current) window.clearTimeout(moodTimerRef.current);
    if (teaseTimerRef.current) window.clearTimeout(teaseTimerRef.current);
    if (teasedElementRef.current) delete teasedElementRef.current.dataset.assistantTeased;
  }, []);

  async function saveCompanionSetup() {
    if (!user) { window.location.href="/auth?next=/"; return; }
    setSavingCompanion(true);
    const normalized=saveCompanionPreferences({...companion,onboardingCompleted:true});
    const {error}=await supabase.from("customer_companion_preferences").upsert({user_id:user.id,name:normalized.name,tone:normalized.tone,theme:normalized.theme,color:normalized.color,size:normalized.size,enabled:normalized.enabled,roaming_enabled:normalized.roamingEnabled,game_invites_enabled:normalized.gameInvitesEnabled,onboarding_completed:true,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    setSavingCompanion(false);
    if (!error) { setCompanion(normalized); setSetupOpen(false); present({mood:"celebrate",text:`تمام! أنا ${normalized.name}، صديقك الجديد في DevPlay 🎉`,duration:10000,priority:8,hearts:true}); }
  }

  function runTutorial(id: TutorialId) {
    const tutorials:Record<TutorialId,{href:string;selector:string;text:string}>={search:{href:"/",selector:"a[href=\"/search\"]",text:"من زر البحث هنا تقدر توصل للعبة أو البطاقة بسرعة."},signup:{href:"/",selector:"a[href^=\"/auth\"]",text:"التسجيل يحفظ محفظتك وطلباتك وإعدادات صديقك على كل أجهزتك."},"player-id":{href:"/products",selector:"[data-companion-target=\"player-id\"]",text:"بعد اختيار باقة الشحن، اكتب Player ID هنا بالضبط كما يظهر داخل اللعبة."},deposit:{href:"/wallet/deposit",selector:"form",text:"من نموذج الإيداع تختار الطريقة، تكتب المبلغ وترفع إثبات التحويل."},orders:{href:"/orders",selector:".orders-page",text:"هنا تتابع طلبات المنتجات والإيداع وحالتها لحظة بلحظة."}};
    const tutorial=tutorials[id]; setMenuOpen(false);
    if(pathname!==tutorial.href&&!(id==="player-id"&&pathname.startsWith("/products/"))){sessionStorage.setItem("devplay:companion:tutorial",id);window.location.href=tutorial.href;return}
    const target=document.querySelector<HTMLElement>(tutorial.selector);
    if(!target){present({mood:"point",text:tutorial.text,action:id==="player-id"?{label:"اختر منتجًا",href:"/products"}:undefined,duration:11000,priority:7});return}
    target.dataset.companionTargetActive="true";target.scrollIntoView({behavior:motionIsReduced()?"auto":"smooth",block:"center"});present({mood:"point",text:tutorial.text,duration:11000,priority:7});window.setTimeout(()=>delete target.dataset.companionTargetActive,10000);
  }

  useEffect(()=>{const queued=sessionStorage.getItem("devplay:companion:tutorial") as TutorialId|null;if(!queued)return;sessionStorage.removeItem("devplay:companion:tutorial");window.setTimeout(()=>runTutorial(queued),700)},[pathname]);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (message || motionIsReduced()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: roaming.x,
      startY: roaming.y,
      moved: false,
    };
    setDragging(true);
    showPlayfulMood("angry", 1200);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 6) drag.moved = true;
    const maxX = Math.max(0, window.innerWidth - 76);
    const maxY = Math.max(0, window.innerHeight - 145);
    const x = Math.min(maxX, Math.max(0, drag.startX + deltaX));
    const y = Math.min(0, Math.max(-maxY, drag.startY + deltaY));
    setRoaming({ x, y, direction: deltaX < 0 ? "left" : "right", moving: false });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) return;
    suppressClickRef.current = true;
    showPlayfulMood("fall", 800);
    moodTimerRef.current = window.setTimeout(() => showPlayfulMood("sulk", 2800), 800);
  }

  if (pathname.startsWith("/admin") || !companion.enabled) return null;

  return (
    <>
    {setupOpen&&<CompanionSetup value={companion} onChange={setCompanion} onComplete={()=>void saveCompanionSetup()} onClose={companion.onboardingCompleted?()=>setSetupOpen(false):undefined} saving={savingCompanion}/>}
    {menuOpen&&<CompanionMenu name={companion.name} onClose={()=>setMenuOpen(false)} onTutorial={runTutorial} onSetup={()=>{setMenuOpen(false);setSetupOpen(true)}} onTicTacToe={()=>{setMenuOpen(false);setGameOpen(true)}} onRps={()=>{setMenuOpen(false);setRpsOpen(true)}}/>}
    <aside
      ref={rootRef}
      className={styles.root}
      data-visual-assistant-root
      data-direction={roaming.direction}
      data-dragging={dragging ? "true" : "false"}
      data-mood={message?.mood ?? playfulMood}
      data-roaming={roaming.moving ? "true" : "false"}
      data-spotlight={message?.spotlight ? "true" : "false"}
      data-hearts={message?.hearts ? "true" : "false"}
      data-tone={companion.tone}
      data-theme={companion.theme}
      data-color={companion.color}
      data-size={companion.size}
      style={{ "--assistant-x": `${roaming.x}px`, "--assistant-y": `${roaming.y}px` } as CSSProperties}
      aria-live="polite"
    >
      <button
        type="button"
        className={styles.mascot}
        aria-label={`${companion.name}، صديق DevPlay — يمكن سحبه`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={()=>{setMenuOpen(true);setMessage(null)}}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          present({
            mood: "wave",
            text: companion.tone === "calm" ? `أهلًا، أنا ${companion.name}. أنا هنا لو احتجت أي مساعدة.` : companion.tone === "energetic" ? `يلا بينا! أنا ${companion.name} ⚡ نطلب مساعدة ولا نلعب جولة؟` : `أهلًا! أنا ${companion.name} 👋 تحبي نطلب مساعدة ولا نلعب جولة سريعة؟`,
            action: { label: "تواصل مع الدعم", href: "/support" },
            duration: 12000,
            priority: 3,
            hearts: true,
          });
          setGameInvited(companion.gameInvitesEnabled);
        }}
      >
        <span className={styles.antenna} />
        <span className={styles.head}><span className={styles.eyes} /><span className={styles.mouth} /></span>
        <span className={styles.body} />
        <span className={styles.armLeft} />
        <span className={styles.armRight} />
      </button>

      {message && bubbleOpen && (
        <div className={styles.bubble}>
          <button type="button" className={styles.close} onClick={() => setBubbleOpen(false)} aria-label="إغلاق"><X size={14} /></button>
          <p>{message.text}</p>
          {message.action && <Link className={styles.action} href={message.action.href}>{message.action.label}</Link>}
          {gameInvited && (
            <button
              type="button"
              className={styles.gameAction}
              onClick={() => {
                setGameInvited(false);
                setMessage(null);
                setGameOpen(true);
              }}
            >
              ابدأ اللعبة
            </button>
          )}
        </div>
      )}
      {rpsOpen&&<RockPaperScissorsGame friendName={companion.name} onClose={()=>setRpsOpen(false)} onResult={(mood)=>showPlayfulMood(mood,2200)}/>}
      {gameOpen && (
        <TicTacToeGame
          onClose={() => setGameOpen(false)}
          onResult={(mood) => showPlayfulMood(mood, mood === "sulk" ? 3200 : 2200)}
        />
      )}
    </aside>
    </>
  );
}