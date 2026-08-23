export type AssistantMood =
  | "idle"
  | "wave"
  | "point"
  | "confused"
  | "angry"
  | "fall"
  | "sulk"
  | "sit"
  | "celebrate"
  | "sympathy";

export interface AssistantMessage {
  mood: AssistantMood;
  text: string;
  action?: { label: string; href: string };
  duration?: number;
  priority?: number;
  spotlight?: boolean;
  hearts?: boolean;
}

export interface TrackedAssistantRequest {
  type: "deposit" | "order";
  id: string;
  displayId: string;
  status: string;
}

const EVENT_NAME = "devplay:visual-assistant";
const QUEUED_MESSAGE_KEY = "devplay:visual-assistant:queued";
const TRACKED_REQUESTS_KEY = "devplay:visual-assistant:tracked";

export function showVisualAssistant(message: AssistantMessage): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AssistantMessage>(EVENT_NAME, { detail: message }));
}

export function queueVisualAssistant(message: AssistantMessage): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(QUEUED_MESSAGE_KEY, JSON.stringify(message));
}

export function consumeQueuedVisualAssistant(): AssistantMessage | null {
  if (typeof window === "undefined") return null;
  const serialized = window.sessionStorage.getItem(QUEUED_MESSAGE_KEY);
  window.sessionStorage.removeItem(QUEUED_MESSAGE_KEY);
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as AssistantMessage;
  } catch {
    return null;
  }
}

export function trackAssistantRequest(request: TrackedAssistantRequest): void {
  if (typeof window === "undefined") return;
  const requests = readTrackedAssistantRequests().filter((item) => item.id !== request.id);
  window.localStorage.setItem(TRACKED_REQUESTS_KEY, JSON.stringify([request, ...requests].slice(0, 12)));
}

export function readTrackedAssistantRequests(): TrackedAssistantRequest[] {
  if (typeof window === "undefined") return [];
  const serialized = window.localStorage.getItem(TRACKED_REQUESTS_KEY);
  if (!serialized) return [];
  try {
    const value = JSON.parse(serialized);
    return Array.isArray(value) ? value as TrackedAssistantRequest[] : [];
  } catch {
    return [];
  }
}

export function saveTrackedAssistantRequests(requests: TrackedAssistantRequest[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRACKED_REQUESTS_KEY, JSON.stringify(requests.slice(0, 12)));
}

export function subscribeToVisualAssistant(
  listener: (message: AssistantMessage) => void,
): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<AssistantMessage>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}