import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (!supabaseUrl || !supabaseServiceKey || !vapidPublic || !vapidPrivate) {
  throw new Error("Missing environment variables");
}

webpush.setVapidDetails(
  "mailto:tainara.dfarias@gmail.com",
  vapidPublic,
  vapidPrivate
);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEAL_REMINDERS = [
  { hour: 7, min: 30, label: "Café da manhã" },
  { hour: 10, min: 0, label: "Lanche da manhã" },
  { hour: 12, min: 0, label: "Almoço" },
  { hour: 15, min: 30, label: "Lanche da tarde" },
  { hour: 19, min: 30, label: "Jantar" },
];

function shouldSendMealReminder(nowHour, nowMin) {
  return MEAL_REMINDERS.find(
    (m) => m.hour === nowHour && Math.abs(m.min - nowMin) <= 5
  );
}

async function sendPushToUser(subscription, payload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expirada — remover
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", subscription.id);
    }
    return false;
  }
}

export default async function handler(req, res) {
  // Validar cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const today = now.toISOString().split("T")[0];

  // Buscar todos os usuários com notificações ativas
  const { data: settings } = await supabase
    .from("user_settings")
    .select("id, notifications_enabled")
    .eq("notifications_enabled", true);

  if (!settings || settings.length === 0) {
    return res.json({ sent: 0, message: "No users with notifications enabled" });
  }

  const userIds = settings.map((s) => s.id);

  // Buscar subscriptions
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (!subscriptions || subscriptions.length === 0) {
    return res.json({ sent: 0, message: "No push subscriptions" });
  }

  let sent = 0;

  for (const sub of subscriptions) {
    // Contar tarefas pendentes
    const { count: taskCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", sub.user_id)
      .eq("status", "pendente")
      .lte("due_date", today);

    const tasks = taskCount || 0;
    const body = tasks > 0
      ? `Você tem ${tasks} tarefa${tasks > 1 ? "s" : ""} para hoje. Bora lá! 💪`
      : "Comece o dia registrando seu café da manhã e bebendo água! 💧";

    const ok = await sendPushToUser(sub, {
      title: "🌱 Bom dia! Seu resumo do Broto",
      body,
      tag: "daily-summary",
    });
    if (ok) sent++;
  }

  return res.json({ sent, time: `${hour}:${min}`, today });
}
