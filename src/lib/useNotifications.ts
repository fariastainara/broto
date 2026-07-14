import { useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

const WATER_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const MEAL_REMINDERS = [
  { hour: 7, min: 30, label: "Café da manhã" },
  { hour: 10, min: 0, label: "Lanche da manhã" },
  { hour: 12, min: 0, label: "Almoço" },
  { hour: 15, min: 30, label: "Lanche da tarde" },
  { hour: 19, min: 30, label: "Jantar" },
];
const TASK_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 horas

export type NotificationPermission = "granted" | "denied" | "default";

export function getPermissionStatus(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission as NotificationPermission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  const result = await Notification.requestPermission();
  return result as NotificationPermission;
}

function sendNotification(title: string, body: string) {
  if (getPermissionStatus() !== "granted") return;
  // Só notifica se o app não está em foco
  if (document.visibilityState === "visible") return;
  try {
    new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: title, // agrupa e evita duplicatas
    });
  } catch {
    // Fallback: service worker notification
    navigator.serviceWorker?.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        tag: title,
      });
    });
  }
}

function getMsUntilTime(hour: number, min: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, min, 0, 0);
  if (target <= now) return -1; // já passou
  return target.getTime() - now.getTime();
}

export function useNotifications(userId: string | undefined, enabled: boolean) {
  const waterTimer = useRef<ReturnType<typeof setInterval>>();
  const mealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const taskTimer = useRef<ReturnType<typeof setInterval>>();

  const checkPendingTasks = useCallback(async () => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pendente")
      .lte("due_date", today);

    if (count && count > 0) {
      sendNotification(
        "🌱 Tarefas pendentes",
        `Você tem ${count} tarefa${count > 1 ? "s" : ""} para hoje!`,
      );
    }
  }, [userId]);

  const startWaterReminder = useCallback(() => {
    waterTimer.current = setInterval(() => {
      sendNotification(
        "💧 Hora de beber água!",
        "Mantenha-se hidratada. Registre sua água no Broto.",
      );
    }, WATER_INTERVAL_MS);
  }, []);

  const scheduleMealReminders = useCallback(() => {
    // Limpa timers anteriores
    mealTimers.current.forEach(clearTimeout);
    mealTimers.current = [];

    for (const meal of MEAL_REMINDERS) {
      const ms = getMsUntilTime(meal.hour, meal.min);
      if (ms > 0) {
        const timer = setTimeout(() => {
          sendNotification(
            `🍽️ ${meal.label}`,
            `Está na hora do seu(a) ${meal.label.toLowerCase()}!`,
          );
        }, ms);
        mealTimers.current.push(timer);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !userId || getPermissionStatus() !== "granted") {
      return;
    }

    startWaterReminder();
    scheduleMealReminders();
    checkPendingTasks();
    taskTimer.current = setInterval(checkPendingTasks, TASK_CHECK_INTERVAL_MS);

    // Re-agendar refeições à meia-noite
    const msUntilMidnight = getMsUntilTime(0, 0);
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    if (msUntilMidnight > 0) {
      midnightTimer = setTimeout(() => {
        scheduleMealReminders();
      }, msUntilMidnight);
    }

    return () => {
      if (waterTimer.current) clearInterval(waterTimer.current);
      mealTimers.current.forEach(clearTimeout);
      if (taskTimer.current) clearInterval(taskTimer.current);
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [
    enabled,
    userId,
    startWaterReminder,
    scheduleMealReminders,
    checkPendingTasks,
  ]);

  // Registrar Web Push subscription para notificações com app fechado
  useEffect(() => {
    if (!enabled || !userId || getPermissionStatus() !== "granted") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    if (!VAPID_PUBLIC_KEY) return;

    navigator.serviceWorker.ready.then(async (registration) => {
      try {
        const existing = await registration.pushManager.getSubscription();
        if (existing) return; // já registrado

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            VAPID_PUBLIC_KEY,
          ) as BufferSource,
        });

        const json = subscription.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
          { onConflict: "user_id,endpoint" },
        );
      } catch (err) {
        console.warn("Push subscription failed:", err);
      }
    });
  }, [enabled, userId]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
