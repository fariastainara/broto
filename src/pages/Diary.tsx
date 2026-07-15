import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  MenuItem,
  Button,
  LinearProgress,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import {
  Droplets,
  Utensils,
  Dumbbell,
  Moon,
  Scale,
  Smile,
  Target,
  Plus,
  Trash2,
  Pencil,
  Laugh,
  Meh,
  Frown,
  Angry,
  Footprints,
  Activity,
  Bike,
  Flame,
  Sparkles,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import PageHeader from "../components/PageHeader";
import BrotoLoader from "../components/BrotoLoader";
import MealSection from "../components/MealSection";
import type {
  MealType,
  MealLog,
  WaterLog,
  Exercise,
  ExerciseType,
  SleepLog,
  WeightLog,
  MoodLog,
  MoodType,
  Habit,
  HabitLog,
  Profile,
} from "../types";

dayjs.locale("pt-br");

const DEFAULT_WATER_GOAL = 2800;
const DEFAULT_SLEEP_GOAL = 8;
const HABIT_HISTORY_DAYS = 60;

const EXERCISE_OPTIONS: Record<
  ExerciseType,
  { label: string; icon: LucideIcon }
> = {
  musculacao: { label: "Musculação", icon: Dumbbell },
  caminhada: { label: "Caminhada", icon: Footprints },
  corrida: { label: "Corrida", icon: Activity },
  bicicleta: { label: "Bicicleta", icon: Bike },
  funcional: { label: "Funcional", icon: Flame },
  outro: { label: "Outro", icon: Sparkles },
};

const MOOD_OPTIONS: Record<MoodType, { icon: LucideIcon; color: string }> = {
  excelente: { icon: Laugh, color: palette.verde },
  bom: { icon: Smile, color: palette.verdeClaro },
  normal: { icon: Meh, color: palette.cinza },
  ruim: { icon: Frown, color: "#D9A441" },
  pessimo: { icon: Angry, color: palette.laranja },
};

const MOOD_LABELS: Record<MoodType, string> = {
  excelente: "Feliz",
  bom: "Tranquilo",
  normal: "Neutro",
  ruim: "Cansado",
  pessimo: "Estressado",
};

/** Etiqueta pequena que agrupa cards relacionados (Nutrição, Corpo, Bem-estar) */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: palette.cinza,
        pl: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

export default function Diary() {
  const { user } = useAuth();
  const today = dayjs().format("YYYY-MM-DD");
  const startOfDay = dayjs(today).startOf("day").toISOString();
  const endOfDay = dayjs(today).endOf("day").toISOString();
  const habitHistoryStart = dayjs(today)
    .subtract(HABIT_HISTORY_DAYS, "day")
    .format("YYYY-MM-DD");

  const [loading, setLoading] = useState(true);

  const [waters, setWaters] = useState<WaterLog[]>([]);

  const [meals, setMeals] = useState<MealLog[]>([]);
  const [mealType, setMealType] = useState<MealType>("almoco");
  const [mealDesc, setMealDesc] = useState("");
  const [mealCal, setMealCal] = useState("");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [exType, setExType] = useState<ExerciseType | "">("");
  const [exDuration, setExDuration] = useState("");
  const [exCalories, setExCalories] = useState("");
  const [exNotes, setExNotes] = useState("");

  const [sleepLog, setSleepLog] = useState<SleepLog | null>(null);
  const [sleptAt, setSleptAt] = useState("");
  const [wokeAt, setWokeAt] = useState("");
  const [editingSleep, setEditingSleep] = useState(false);
  const [sleptFocused, setSleptFocused] = useState(false);
  const [wokeFocused, setWokeFocused] = useState(false);

  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [weightVal, setWeightVal] = useState("");
  const [profileWeight, setProfileWeight] = useState<number | null>(null);

  const [moodLog, setMoodLog] = useState<MoodLog | null>(null);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitTitle, setEditingHabitTitle] = useState("");

  const [waterGoal, setWaterGoal] = useState(DEFAULT_WATER_GOAL);
  const [sleepGoal, setSleepGoal] = useState(DEFAULT_SLEEP_GOAL);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalDialogType, setGoalDialogType] = useState<"water" | "sleep">(
    "water",
  );
  const [goalDialogValue, setGoalDialogValue] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    const [
      watersRes,
      mealsRes,
      exercisesRes,
      sleepRes,
      weightsRes,
      moodRes,
      habitsRes,
      habitLogsRes,
      settingsRes,
      profileRes,
    ] = await Promise.all([
      supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay)
        .order("logged_at", { ascending: true }),
      supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay)
        .order("logged_at", { ascending: true }),
      supabase
        .from("exercises")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay)
        .order("logged_at", { ascending: true }),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", today)
        .maybeSingle(),
      supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_date", { ascending: false })
        .limit(30),
      supabase
        .from("mood_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", today)
        .maybeSingle(),
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      // últimos 60 dias (não só hoje) — necessário pra calcular a sequência (streak) de verdade
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_date", habitHistoryStart),
      supabase
        .from("user_settings")
        .select("water_goal_ml, sleep_goal_hours")
        .eq("id", user.id)
        .single(),
      supabase.from("profiles").select("weight_kg").eq("id", user.id).single(),
    ]);

    setWaters(watersRes.data ?? []);
    setMeals(mealsRes.data ?? []);
    setExercises(exercisesRes.data ?? []);
    setSleepLog(sleepRes.data ?? null);
    setWeights(weightsRes.data ?? []);
    setMoodLog(moodRes.data ?? null);
    setHabits(habitsRes.data ?? []);
    setHabitLogs(habitLogsRes.data ?? []);

    if (settingsRes.data) {
      setWaterGoal(settingsRes.data.water_goal_ml ?? DEFAULT_WATER_GOAL);
      setSleepGoal(settingsRes.data.sleep_goal_hours ?? DEFAULT_SLEEP_GOAL);
    }

    if (profileRes.data) {
      setProfileWeight((profileRes.data as Profile).weight_kg ?? null);
    }

    if (sleepRes.data) {
      setSleptAt(dayjs(sleepRes.data.slept_at).format("HH:mm"));
      setWokeAt(dayjs(sleepRes.data.woke_at).format("HH:mm"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  // --- Água ---
  async function addWater(ml: number) {
    if (!user) return;
    await supabase.from("water_logs").insert({
      user_id: user.id,
      amount_ml: ml,
      logged_at: new Date().toISOString(),
    });
    loadData();
  }

  async function removeWater(id: string) {
    await supabase.from("water_logs").delete().eq("id", id);
    loadData();
  }

  const totalWater = waters.reduce((acc, w) => acc + w.amount_ml, 0);
  const waterPct = Math.min(100, Math.round((totalWater / waterGoal) * 100));

  // --- Refeições ---
  async function addMeal() {
    if (!user || !mealDesc.trim()) return;
    await supabase.from("meal_logs").insert({
      user_id: user.id,
      meal_type: mealType,
      description: mealDesc.trim(),
      calories: mealCal ? Number(mealCal) : null,
      logged_at: new Date().toISOString(),
    });
    setMealDesc("");
    setMealCal("");
    loadData();
  }

  async function removeMeal(id: string) {
    await supabase.from("meal_logs").delete().eq("id", id);
    loadData();
  }

  const totalCalories = meals.reduce((acc, m) => acc + (m.calories ?? 0), 0);

  // --- Exercícios ---
  async function addExercise() {
    if (!user || !exType || !exDuration) return;
    setActionBusy(true);
    await supabase.from("exercises").insert({
      user_id: user.id,
      exercise_type: exType,
      duration_min: Number(exDuration),
      calories: exCalories ? Number(exCalories) : null,
      notes: exNotes.trim() || null,
      logged_at: new Date().toISOString(),
    });
    setExDuration("");
    setExCalories("");
    setExNotes("");
    setExType("");
    setActionBusy(false);
    loadData();
  }

  async function removeExercise(id: string) {
    await supabase.from("exercises").delete().eq("id", id);
    loadData();
  }

  // --- Sono ---
  async function saveSleep() {
    if (!user || !sleptAt || !wokeAt) return;
    setActionBusy(true);
    const sleptDate = dayjs(`${today} ${sleptAt}`);
    const wokeDate = dayjs(`${today} ${wokeAt}`);

    if (sleepLog) {
      await supabase
        .from("sleep_logs")
        .update({
          slept_at: sleptDate.toISOString(),
          woke_at: wokeDate.toISOString(),
        })
        .eq("id", sleepLog.id);
    } else {
      await supabase.from("sleep_logs").insert({
        user_id: user.id,
        slept_at: sleptDate.toISOString(),
        woke_at: wokeDate.toISOString(),
        logged_date: today,
      });
    }
    setActionBusy(false);
    loadData();
  }

  function sleepHours(): string {
    if (!sleptAt || !wokeAt) return "--";
    let slept = dayjs(`${today} ${sleptAt}`);
    const woke = dayjs(`${today} ${wokeAt}`);
    if (woke.isBefore(slept)) slept = slept.subtract(1, "day");
    const diff = woke.diff(slept, "minute");
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h${m > 0 ? `${m}min` : ""}`;
  }

  // --- Peso ---
  async function addWeight() {
    if (!user || !weightVal) return;
    setActionBusy(true);
    const existing = weights.find((w) => w.logged_date === today);
    if (existing) {
      await supabase
        .from("weight_logs")
        .update({ weight_kg: Number(weightVal) })
        .eq("id", existing.id);
    } else {
      await supabase.from("weight_logs").insert({
        user_id: user.id,
        weight_kg: Number(weightVal),
        logged_date: today,
      });
    }
    setWeightVal("");
    setActionBusy(false);
    loadData();
  }

  const weightChartData = [...weights]
    .reverse()
    .slice(-14)
    .map((w) => ({
      date: dayjs(w.logged_date).format("DD/MM"),
      kg: w.weight_kg,
    }));

  // --- Humor ---
  async function selectMood(mood: MoodType) {
    if (!user) return;
    if (moodLog) {
      await supabase.from("mood_logs").update({ mood }).eq("id", moodLog.id);
    } else {
      await supabase
        .from("mood_logs")
        .insert({ user_id: user.id, mood, logged_date: today });
    }
    loadData();
  }

  // --- Hábitos ---
  async function createHabit() {
    if (!user || !newHabitTitle.trim()) return;
    setActionBusy(true);
    await supabase
      .from("habits")
      .insert({ user_id: user.id, title: newHabitTitle.trim() });
    setNewHabitTitle("");
    setHabitDialogOpen(false);
    setActionBusy(false);
    loadData();
  }

  async function toggleHabit(habitId: string) {
    if (!user) return;
    const existing = habitLogs.find(
      (hl) => hl.habit_id === habitId && hl.logged_date === today,
    );
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("habit_logs")
        .insert({ habit_id: habitId, user_id: user.id, logged_date: today });
    }
    loadData();
  }

  async function removeHabit(id: string) {
    await supabase.from("habit_logs").delete().eq("habit_id", id);
    await supabase.from("habits").delete().eq("id", id);
    loadData();
  }

  async function saveEditHabit(id: string) {
    if (!editingHabitTitle.trim()) return;
    const newTitle = editingHabitTitle.trim();
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, title: newTitle } : h)),
    );
    setEditingHabitId(null);
    setEditingHabitTitle("");
    await supabase.from("habits").update({ title: newTitle }).eq("id", id);
    loadData();
  }

  /** Sequência real de dias consecutivos (incluindo hoje, se já marcado; senão até ontem). */
  function getStreak(habitId: string): number {
    const dateSet = new Set(
      habitLogs
        .filter((hl) => hl.habit_id === habitId)
        .map((hl) => hl.logged_date),
    );
    if (dateSet.size === 0) return 0;

    let streak = 0;
    let cursor = dateSet.has(today)
      ? dayjs(today)
      : dayjs(today).subtract(1, "day");
    while (dateSet.has(cursor.format("YYYY-MM-DD"))) {
      streak++;
      cursor = cursor.subtract(1, "day");
    }
    return streak;
  }

  // --- Metas ---
  async function saveGoal() {
    if (!user) return;
    setActionBusy(true);
    const updates =
      goalDialogType === "water"
        ? { water_goal_ml: parseInt(goalDialogValue) || DEFAULT_WATER_GOAL }
        : {
            sleep_goal_hours: parseFloat(goalDialogValue) || DEFAULT_SLEEP_GOAL,
          };

    await supabase.from("user_settings").upsert({ id: user.id, ...updates });

    if (goalDialogType === "water") {
      setWaterGoal(updates.water_goal_ml ?? waterGoal);
    } else {
      setSleepGoal(updates.sleep_goal_hours ?? sleepGoal);
    }
    setActionBusy(false);
    setGoalDialogOpen(false);
  }

  if (loading) {
    return <BrotoLoader label="Preparando seu diário" fullScreen={false} />;
  }

  const habitsDoneCount = habits.filter((h) =>
    habitLogs.some((hl) => hl.habit_id === h.id && hl.logged_date === today),
  ).length;

  return (
    <Box>
      <PageHeader
        eyebrow="Diário"
        title="Hoje"
        subtitle={dayjs(today)
          .format("dddd, D [de] MMMM")
          .replace(/^\w/, (c) => c.toUpperCase())}
      />

      {/* Resumo rápido do dia — dá contexto imediato antes de rolar pelas 7 seções abaixo */}
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 3 }}
      >
        <Chip
          icon={<Droplets size={14} color={palette.verde} />}
          label={`${waterPct}% água`}
          sx={{ bgcolor: palette.menta, color: palette.verde, fontWeight: 600 }}
        />
        {totalCalories > 0 && (
          <Chip
            icon={<Utensils size={14} color={palette.laranja} />}
            label={`${totalCalories} kcal`}
            sx={{
              bgcolor: "rgba(224,122,58,0.1)",
              color: palette.laranja,
              fontWeight: 600,
            }}
          />
        )}
        {sleptAt && wokeAt && (
          <Chip
            icon={<Moon size={14} color={palette.cinza} />}
            label={sleepHours()}
            sx={{
              bgcolor: "rgba(107,114,128,0.1)",
              color: palette.cinza,
              fontWeight: 600,
            }}
          />
        )}
        {moodLog && (
          <Chip
            icon={(() => {
              const MoodIcon = MOOD_OPTIONS[moodLog.mood].icon;
              const moodColor = MOOD_OPTIONS[moodLog.mood].color;
              return <MoodIcon size={14} color="#fff" />;
            })()}
            label={MOOD_LABELS[moodLog.mood]}
            sx={{
              bgcolor: MOOD_OPTIONS[moodLog.mood].color,
              color: "#fff",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          />
        )}
        {habits.length > 0 && (
          <Chip
            icon={<Repeat size={14} color={palette.verde} />}
            label={`${habitsDoneCount}/${habits.length} hábitos`}
            sx={{
              bgcolor: palette.menta,
              color: palette.verde,
              fontWeight: 600,
            }}
          />
        )}
      </Stack>

      <Stack spacing={2.5}>
        <SectionLabel>Nutrição</SectionLabel>

        {/* ÁGUA */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.verde + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Droplets size={20} color={palette.verde} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Água</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Registre sua hidratação do dia
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography color="text.secondary" fontSize={13}>
                  Meta: {waterGoal}ml
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setGoalDialogType("water");
                    setGoalDialogValue(waterGoal.toString());
                    setGoalDialogOpen(true);
                  }}
                >
                  <Pencil size={14} color={palette.cinza} />
                </IconButton>
              </Stack>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mt: 2 }}
            >
              <LinearProgress
                variant="determinate"
                value={waterPct}
                sx={{
                  flex: 1,
                  height: 10,
                  borderRadius: 5,
                  bgcolor: palette.menta,
                  "& .MuiLinearProgress-bar": { bgcolor: palette.verdeClaro },
                }}
              />
              <Typography fontSize={12} color="text.secondary" fontWeight={500}>
                {waterPct}%
              </Typography>
            </Stack>

            <Box sx={{ mt: 3 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 2 }}
                flexWrap="wrap"
                useFlexGap
              >
                {[
                  { ml: 200, bg: "rgba(45,106,79,0.08)", color: palette.verde },
                  { ml: 300, bg: "rgba(45,106,79,0.14)", color: palette.verde },
                  { ml: 500, bg: "rgba(45,106,79,0.22)", color: palette.verde },
                  { ml: 1000, bg: palette.laranja, color: "#fff" },
                ].map(({ ml, bg, color }) => (
                  <motion.div
                    key={ml}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04 }}
                  >
                    <Box
                      onClick={() => addWater(ml)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.7,
                        px: 1.8,
                        py: 0.9,
                        borderRadius: 999,
                        bgcolor: bg,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <Droplets size={13} color={color} />
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: ml >= 500 ? 700 : 600,
                          color,
                        }}
                      >
                        +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </Stack>

              {waters.length > 0 && (
                <Stack sx={{ mt: 2 }} divider={<Divider />}>
                  {waters.map((w) => (
                    <Stack
                      key={w.id}
                      direction="row"
                      alignItems="center"
                      sx={{ py: 0.5 }}
                    >
                      <Typography fontSize={13} sx={{ flex: 1 }}>
                        {w.amount_ml} ml — {dayjs(w.logged_at).format("HH:mm")}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeWater(w.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* REFEIÇÕES */}
        <MealSection userId={user!.id} meals={meals} onDataChange={loadData} />

        <SectionLabel>Corpo & atividade</SectionLabel>

        {/* EXERCÍCIOS */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.verdeClaro + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Dumbbell size={20} color={palette.verdeClaro} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Exercícios</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Registre suas atividades físicas do dia
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  setExType("");
                  setExDuration("");
                  setExCalories("");
                  setExNotes("");
                  setExerciseDialogOpen(true);
                }}
              >
                <Plus size={20} />
              </IconButton>
            </Stack>

            {exercises.length > 0 && (
              <Stack divider={<Divider />} sx={{ mt: 2 }}>
                {exercises.map((ex) => (
                  <Stack
                    key={ex.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ py: 1 }}
                  >
                    <Box sx={{ flex: 1 }}>
                      {(() => {
                        const { label, icon: Icon } =
                          EXERCISE_OPTIONS[ex.exercise_type];
                        return (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.7}
                          >
                            <Icon size={15} color={palette.verdeClaro} />
                            <Typography fontWeight={600} fontSize={14}>
                              {label}
                            </Typography>
                          </Stack>
                        );
                      })()}
                      <Typography fontSize={13} color="text.secondary">
                        {ex.duration_min} min
                        {ex.calories ? ` · ${ex.calories} kcal` : ""}
                        {ex.notes ? ` · ${ex.notes}` : ""}
                      </Typography>
                    </Box>
                    <Typography fontSize={12} color="text.secondary">
                      {dayjs(ex.logged_at).format("HH:mm")}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => removeExercise(ex.id)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* SONO */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.cinza + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Moon size={20} color={palette.cinza} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Sono</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Registre suas horas de descanso
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography color="text.secondary" fontSize={13}>
                  Meta: {sleepGoal}h
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setGoalDialogType("sleep");
                    setGoalDialogValue(sleepGoal.toString());
                    setGoalDialogOpen(true);
                  }}
                >
                  <Pencil size={14} color={palette.cinza} />
                </IconButton>
              </Stack>
            </Stack>

            {sleepLog && !editingSleep ? (
              <Stack sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      bgcolor: palette.menta,
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      flex: 1,
                    }}
                  >
                    <Typography
                      fontSize={13}
                      color={palette.verde}
                      fontWeight={600}
                    >
                      ✓ {sleepHours()} de sono registrado
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => setEditingSleep(true)}
                    sx={{ color: palette.cinza, fontSize: 12, minWidth: 0 }}
                  >
                    Editar
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Dormi às"
                    type="time"
                    value={sleptAt}
                    onChange={(e) => setSleptAt(e.target.value)}
                    onFocus={() => setSleptFocused(true)}
                    onBlur={() => setSleptFocused(false)}
                    size="small"
                    InputLabelProps={{ shrink: sleptFocused || !!sleptAt }}
                    sx={{
                      flex: 1,
                      '& input[type="time"]::-webkit-datetime-edit': {
                        color:
                          sleptFocused || sleptAt ? "inherit" : "transparent",
                      },
                    }}
                  />
                  <TextField
                    label="Acordei às"
                    type="time"
                    value={wokeAt}
                    onChange={(e) => setWokeAt(e.target.value)}
                    onFocus={() => setWokeFocused(true)}
                    onBlur={() => setWokeFocused(false)}
                    size="small"
                    InputLabelProps={{ shrink: wokeFocused || !!wokeAt }}
                    sx={{
                      flex: 1,
                      '& input[type="time"]::-webkit-datetime-edit': {
                        color:
                          wokeFocused || wokeAt ? "inherit" : "transparent",
                      },
                    }}
                  />
                </Stack>
                <Button
                  variant="contained"
                  onClick={() => {
                    saveSleep();
                    setEditingSleep(false);
                  }}
                  disabled={!sleptAt || !wokeAt || actionBusy}
                  fullWidth
                >
                  {actionBusy ? (
                    <CircularProgress size={20} sx={{ color: "white" }} />
                  ) : (
                    (sleepLog ? "Atualizar" : "Registrar") + " sono"
                  )}
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* PESO */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.laranja + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scale size={20} color={palette.laranja} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Peso</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Acompanhe sua evolução de peso
                </Typography>
              </Box>
            </Stack>

            {(() => {
              const todayWeight = weights.find((w) => w.logged_date === today);
              const [editing, setEditing] = [
                weightVal !== "",
                (v: boolean) => {
                  if (!v) setWeightVal("");
                },
              ];

              if (todayWeight && !weightVal) {
                return (
                  <Stack sx={{ mt: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          bgcolor: palette.menta,
                          borderRadius: 2,
                          px: 2,
                          py: 1,
                          flex: 1,
                        }}
                      >
                        <Typography
                          fontSize={13}
                          color={palette.verde}
                          fontWeight={600}
                        >
                          ✓ Registrado hoje: {todayWeight.weight_kg} kg
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={() =>
                          setWeightVal(String(todayWeight.weight_kg))
                        }
                        sx={{ color: palette.cinza, fontSize: 12, minWidth: 0 }}
                      >
                        Editar
                      </Button>
                    </Stack>
                  </Stack>
                );
              }

              return (
                <>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <TextField
                      label="Peso (kg)"
                      type="number"
                      value={weightVal}
                      onChange={(e) => setWeightVal(e.target.value)}
                      size="small"
                      inputProps={{ step: 0.1 }}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="contained"
                      onClick={addWeight}
                      disabled={!weightVal || actionBusy}
                    >
                      {actionBusy ? (
                        <CircularProgress size={20} sx={{ color: "white" }} />
                      ) : todayWeight ? (
                        "Atualizar"
                      ) : (
                        "Registrar"
                      )}
                    </Button>
                  </Stack>

                  {profileWeight && !weightVal && !todayWeight && (
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={`Manter ${profileWeight} kg`}
                        size="small"
                        onClick={() => setWeightVal(String(profileWeight))}
                        sx={{
                          bgcolor: "rgba(0,0,0,0.04)",
                          color: palette.cinza,
                          fontWeight: 500,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "rgba(0,0,0,0.08)" },
                        }}
                      />
                    </Box>
                  )}
                </>
              );
            })()}

            {weightChartData.length >= 2 && (
              <Box sx={{ width: "100%", height: 120, mt: 2, pl: 7 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightChartData}>
                    <defs>
                      <linearGradient
                        id="weightGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={palette.verdeClaro}
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor={palette.verdeClaro}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} kg`, "Peso"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="kg"
                      stroke={palette.verdeClaro}
                      fill="url(#weightGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>

        <SectionLabel>Bem-estar</SectionLabel>

        {/* HUMOR */}
        <Card>
          <CardContent>
            <Stack
              direction="row"
              alignItems="flex-start"
              spacing={2}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.verdeClaro + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Smile size={20} color={palette.verdeClaro} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Humor</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Como você está se sentindo hoje?
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={0}
              justifyContent="space-between"
              sx={{ mt: 2 }}
            >
              {(
                Object.entries(MOOD_OPTIONS) as [
                  MoodType,
                  { icon: LucideIcon; color: string },
                ][]
              ).map(([key, { icon: Icon, color }]) => {
                const active = moodLog?.mood === key;
                return (
                  <Box
                    key={key}
                    onClick={() => selectMood(key)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.7,
                      cursor: "pointer",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: active ? color : "rgba(0,0,0,0.04)",
                        scale: active ? 1.08 : 1,
                      }}
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: active ? 1.08 : 1.06 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <motion.div
                        animate={
                          active
                            ? {
                                y: [0, -3, 0],
                                rotate: [0, -6, 6, 0],
                              }
                            : { y: 0, rotate: 0 }
                        }
                        transition={
                          active
                            ? {
                                duration: 1.1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                repeatDelay: 0.4,
                              }
                            : { duration: 0.2 }
                        }
                        style={{ display: "flex" }}
                      >
                        <Icon
                          size={22}
                          color={active ? "#fff" : palette.cinza}
                          strokeWidth={active ? 2.2 : 1.8}
                        />
                      </motion.div>
                    </motion.div>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: active ? 600 : 500,
                        color: active ? color : palette.cinza,
                        textTransform: "capitalize",
                      }}
                    >
                      {MOOD_LABELS[key]}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>

        {/* HÁBITOS */}
        <Card>
          <CardContent>
            <Stack
              direction="row"
              alignItems="flex-start"
              spacing={2}
              sx={{ mb: habits.length > 0 ? 2 : 0 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.verde + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Repeat size={20} color={palette.verde} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Hábitos</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Marque seus hábitos diariamente e acompanhe sua sequência
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setHabitDialogOpen(true)}>
                <Plus size={20} />
              </IconButton>
            </Stack>

            {habits.length > 0 && (
              <Stack>
                {habits.map((h) => {
                  const checkedToday = habitLogs.some(
                    (hl) => hl.habit_id === h.id && hl.logged_date === today,
                  );
                  const streak = getStreak(h.id);
                  return (
                    <Stack key={h.id} direction="row" alignItems="center">
                      <Checkbox
                        checked={checkedToday}
                        onChange={() => toggleHabit(h.id)}
                        sx={{
                          color: palette.verdeClaro,
                          "&.Mui-checked": { color: palette.verde },
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        {editingHabitId === h.id ? (
                          <TextField
                            variant="standard"
                            size="small"
                            value={editingHabitTitle}
                            onChange={(e) =>
                              setEditingHabitTitle(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditHabit(h.id);
                              if (e.key === "Escape") setEditingHabitId(null);
                            }}
                            onBlur={() => saveEditHabit(h.id)}
                            autoFocus
                            fullWidth
                            InputProps={{ disableUnderline: true }}
                            inputProps={{ style: { fontSize: 14 } }}
                          />
                        ) : (
                          <Typography
                            fontSize={14}
                            onClick={() => {
                              setEditingHabitId(h.id);
                              setEditingHabitTitle(h.title);
                            }}
                            sx={{
                              textDecoration: checkedToday
                                ? "line-through"
                                : "none",
                              cursor: "pointer",
                            }}
                          >
                            {h.icon ? `${h.icon} ` : ""}
                            {h.title}
                          </Typography>
                        )}
                      </Box>
                      {streak > 0 && (
                        <Chip
                          label={`🔥 ${streak}`}
                          size="small"
                          sx={{
                            bgcolor: palette.menta,
                            color: palette.verde,
                            mr: 1,
                          }}
                        />
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeHabit(h.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Dialog: novo exercício */}
      <Dialog
        open={exerciseDialogOpen}
        onClose={() => setExerciseDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: palette.verdeClaro + "18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Dumbbell size={20} color={palette.verdeClaro} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Novo exercício
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Registre sua atividade física
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 4 }}>
            <TextField
              select
              label={exType ? "" : "Tipo"}
              value={exType}
              onChange={(e) => setExType(e.target.value as ExerciseType)}
              size="small"
              InputLabelProps={{ shrink: false }}
              fullWidth
            >
              {(
                Object.entries(EXERCISE_OPTIONS) as [
                  ExerciseType,
                  { label: string; icon: LucideIcon },
                ][]
              ).map(([value, { label, icon: Icon }]) => (
                <MenuItem key={value} value={value}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon size={16} color={palette.verdeClaro} />
                    <span>{label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Duração (min)"
                type="number"
                value={exDuration}
                onChange={(e) => setExDuration(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Calorias"
                type="number"
                value={exCalories}
                onChange={(e) => setExCalories(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              label="Observações"
              value={exNotes}
              onChange={(e) => setExNotes(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setExerciseDialogOpen(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              addExercise();
              setExerciseDialogOpen(false);
            }}
            disabled={!exType || !exDuration || actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Adicionar"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: novo hábito */}
      <Dialog
        open={habitDialogOpen}
        onClose={() => setHabitDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: 1 },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: palette.verde + "18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Repeat size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Novo hábito
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Algo que você quer fazer todos os dias
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            autoFocus
            label="Ex: Ler 30min, Meditar, Alongar..."
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            fullWidth
            sx={{ mt: 4 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setHabitDialogOpen(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={createHabit}
            disabled={!newHabitTitle.trim() || actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Criar hábito"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: editar meta */}
      <Dialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: 1 },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor:
                  goalDialogType === "water"
                    ? palette.verde + "18"
                    : "#8B5CF618",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {goalDialogType === "water" ? (
                <Droplets size={20} color={palette.verde} />
              ) : (
                <Moon size={20} color="#8B5CF6" />
              )}
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                {goalDialogType === "water" ? "Meta de água" : "Meta de sono"}
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                {goalDialogType === "water"
                  ? "Quanto de água quer beber por dia"
                  : "Quantas horas quer dormir por noite"}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            autoFocus
            label={goalDialogType === "water" ? "Meta (ml)" : "Meta (horas)"}
            type="number"
            value={goalDialogValue}
            onChange={(e) => setGoalDialogValue(e.target.value)}
            fullWidth
            sx={{ mt: 4 }}
            inputProps={
              goalDialogType === "water"
                ? { min: 500, step: 100 }
                : { min: 4, max: 12, step: 0.5 }
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setGoalDialogOpen(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveGoal}
            disabled={!goalDialogValue || actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
