import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Flame,
  Target,
  Calendar,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "../lib/supabaseClient";
import { palette } from "../theme";
import type { WaterLog, StudySession, MealPlanOption } from "../types";

dayjs.locale("pt-br");

const WATER_GOAL = 2800;
const RING_OUTER_RADIUS = 13;
const RING_STROKE = 2.6;
const RING_PITCH = 3.6; // distância entre o centro de um anel e o próximo

interface DayData {
  water: boolean;
  exercise: boolean;
  sleep: boolean;
  meals: boolean;
  study: boolean;
  challenge: boolean;
  habit: boolean;
}

/** Dados detalhados por dia para o modal */
interface DayDetail {
  waterMl: number;
  exerciseMin: number;
  sleepHours: number;
  mealsCount: number;
  mealsTotal: number;
  studyMin: number;
  challengesDone: number;
  challengesTotal: number;
  habitsDone: number;
  habitsTotal: number;
}

interface CategoryConfig {
  key: keyof DayData;
  label: string;
  color: string;
  icon: typeof BookOpen;
  fixed: boolean;
}

// As 4 fixas aparecem por padrão. Estudos/Desafios/Hábitos são opcionais:
// ao ativar qualquer uma delas, elas SUBSTITUEM as fixas no anel (não somam).
const CATEGORIES: CategoryConfig[] = [
  {
    key: "water",
    label: "Hidratação",
    color: palette.verde,
    icon: BookOpen,
    fixed: true,
  },
  {
    key: "exercise",
    label: "Exercícios",
    color: palette.verdeClaro,
    icon: BookOpen,
    fixed: true,
  },
  {
    key: "sleep",
    label: "Sono",
    color: palette.cinza,
    icon: BookOpen,
    fixed: true,
  },
  {
    key: "meals",
    label: "Refeições",
    color: palette.laranja,
    icon: BookOpen,
    fixed: true,
  },
  {
    key: "study",
    label: "Estudos",
    color: "#6366F1",
    icon: BookOpen,
    fixed: false,
  },
  {
    key: "challenge",
    label: "Desafios",
    color: "#D9A441",
    icon: Flame,
    fixed: false,
  },
  {
    key: "habit",
    label: "Hábitos",
    color: "#8B5CF6",
    icon: Target,
    fixed: false,
  },
];

const FIXED_CATEGORIES = CATEGORIES.filter((c) => c.fixed);
const EXTRA_CATEGORIES = CATEGORIES.filter((c) => !c.fixed);

interface MonthlyProgressProps {
  userId: string;
}

/** Badge de anéis concêntricos — sem texto dentro; o número do dia fica acima, fora do SVG. */
function DayRingBadge({
  dayData,
  categories,
}: {
  dayData: DayData | undefined;
  categories: CategoryConfig[];
  isToday: boolean;
}) {
  return (
    <Box sx={{ position: "relative", width: 28, height: 28, mx: "auto" }}>
      <svg viewBox="0 0 30 30" width="100%" height="100%">
        {categories.map((cat, i) => {
          const radius = RING_OUTER_RADIUS - i * RING_PITCH;
          const achieved = dayData?.[cat.key] ?? false;
          return (
            <circle
              key={cat.key}
              cx="15"
              cy="15"
              r={radius}
              fill="none"
              stroke={achieved ? cat.color : "rgba(0,0,0,0.07)"}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </Box>
  );
}

export default function MonthlyProgress({ userId }: MonthlyProgressProps) {
  const [month, setMonth] = useState(dayjs());
  const [data, setData] = useState<Map<string, DayData>>(new Map());
  const [details, setDetails] = useState<Map<string, DayDetail>>(new Map());
  const [loading, setLoading] = useState(false);
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    day: number;
  } | null>(null);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const start = month.startOf("month").format("YYYY-MM-DD");
    const end = month.endOf("month").format("YYYY-MM-DD");
    const startISO = month.startOf("month").toISOString();
    const endISO = month.endOf("month").endOf("day").toISOString();

    const [
      waterRes,
      exerciseRes,
      sleepRes,
      mealRes,
      studyRes,
      checkinRes,
      planRes,
      habitsRes,
      habitLogsRes,
      challengesRes,
    ] = await Promise.all([
      supabase
        .from("water_logs")
        .select("logged_at, amount_ml")
        .eq("user_id", userId)
        .gte("logged_at", startISO)
        .lte("logged_at", endISO),
      supabase
        .from("exercises")
        .select("logged_at, duration_min")
        .eq("user_id", userId)
        .gte("logged_at", startISO)
        .lte("logged_at", endISO),
      supabase
        .from("sleep_logs")
        .select("logged_date, slept_at, woke_at")
        .eq("user_id", userId)
        .gte("logged_date", start)
        .lte("logged_date", end),
      supabase
        .from("meal_logs")
        .select("logged_at, meal_type")
        .eq("user_id", userId)
        .gte("logged_at", startISO)
        .lte("logged_at", endISO),
      supabase
        .from("study_sessions")
        .select("started_at, ended_at")
        .eq("user_id", userId)
        .gte("started_at", startISO)
        .lte("started_at", endISO),
      supabase
        .from("challenge_checkins")
        .select("checkin_date")
        .eq("user_id", userId)
        .gte("checkin_date", start)
        .lte("checkin_date", end),
      supabase
        .from("meal_plan_options")
        .select("meal_type")
        .eq("user_id", userId),
      supabase.from("habits").select("id").eq("user_id", userId),
      supabase
        .from("habit_logs")
        .select("habit_id, logged_date")
        .eq("user_id", userId)
        .gte("logged_date", start)
        .lte("logged_date", end),
      supabase.from("challenges").select("id").eq("user_id", userId),
    ]);

    const waterLogs = (waterRes.data ?? []) as Pick<
      WaterLog,
      "logged_at" | "amount_ml"
    >[];
    const exerciseLogs = (exerciseRes.data ?? []) as {
      logged_at: string;
      duration_min: number;
    }[];
    const sleepLogs = (sleepRes.data ?? []) as {
      logged_date: string;
      slept_at: string;
      woke_at: string;
    }[];
    const mealLogs = (mealRes.data ?? []) as {
      logged_at: string;
      meal_type: string;
    }[];
    const studyLogs = (studyRes.data ?? []) as {
      started_at: string;
      ended_at: string;
    }[];
    const checkinLogs = (checkinRes.data ?? []) as { checkin_date: string }[];
    const planOptions = (planRes.data ?? []) as Pick<
      MealPlanOption,
      "meal_type"
    >[];
    const allHabits = (habitsRes.data ?? []) as { id: string }[];
    const habitLogs = (habitLogsRes.data ?? []) as {
      habit_id: string;
      logged_date: string;
    }[];
    const allChallenges = (challengesRes.data ?? []) as { id: string }[];

    const planTypes = new Set(planOptions.map((p) => p.meal_type));
    const checkinDates = new Set(checkinLogs.map((c) => c.checkin_date));

    const map = new Map<string, DayData>();
    const detailMap = new Map<string, DayDetail>();
    const daysInMonth = month.daysInMonth();
    const SLEEP_GOAL = 8;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = month.date(d).format("YYYY-MM-DD");

      const dayWater = waterLogs
        .filter((w) => dayjs(w.logged_at).format("YYYY-MM-DD") === date)
        .reduce((acc, w) => acc + w.amount_ml, 0);
      const waterOk = dayWater >= WATER_GOAL;

      const dayExercises = exerciseLogs.filter(
        (e) => dayjs(e.logged_at).format("YYYY-MM-DD") === date,
      );
      const exerciseMin = dayExercises.reduce(
        (acc, e) => acc + (e.duration_min || 0),
        0,
      );
      const exerciseOk = dayExercises.length > 0;

      const sleepLog = sleepLogs.find((s) => s.logged_date === date);
      let sleepHours = 0;
      if (sleepLog) {
        let slept = dayjs(sleepLog.slept_at);
        const woke = dayjs(sleepLog.woke_at);
        if (woke.isBefore(slept)) slept = slept.subtract(1, "day");
        sleepHours = Math.round((woke.diff(slept, "minute") / 60) * 10) / 10;
      }
      const sleepOk = sleepHours > 0;

      const dayMealTypes = new Set(
        mealLogs
          .filter((m) => dayjs(m.logged_at).format("YYYY-MM-DD") === date)
          .map((m) => m.meal_type),
      );
      const mealsTotal = planTypes.size > 0 ? planTypes.size : 1;
      const mealsCount =
        planTypes.size > 0
          ? [...planTypes].filter((t) => dayMealTypes.has(t)).length
          : dayMealTypes.size > 0
            ? 1
            : 0;
      const mealsOk =
        planTypes.size > 0
          ? [...planTypes].every((t) => dayMealTypes.has(t))
          : dayMealTypes.size > 0;

      const daySessions = studyLogs.filter(
        (s) => dayjs(s.started_at).format("YYYY-MM-DD") === date,
      );
      const studyMin = daySessions.reduce(
        (acc, s) => acc + dayjs(s.ended_at).diff(dayjs(s.started_at), "minute"),
        0,
      );
      const studyOk = studyMin > 0;

      const dayCheckins = checkinLogs.filter((c) => c.checkin_date === date);
      const challengesDone = dayCheckins.length;
      const challengesTotal = allChallenges.length;
      const challengeOk = challengesDone > 0;

      const dayHabitLogs = habitLogs.filter((hl) => hl.logged_date === date);
      const habitsDone = dayHabitLogs.length;
      const habitsTotal = allHabits.length;
      const habitOk = habitsTotal > 0 && habitsDone >= habitsTotal;

      map.set(date, {
        water: waterOk,
        exercise: exerciseOk,
        sleep: sleepOk,
        meals: mealsOk,
        study: studyOk,
        challenge: challengeOk,
        habit: habitOk,
      });

      detailMap.set(date, {
        waterMl: dayWater,
        exerciseMin,
        sleepHours,
        mealsCount,
        mealsTotal,
        studyMin,
        challengesDone,
        challengesTotal,
        habitsDone,
        habitsTotal,
      });
    }

    setData(map);
    setDetails(detailMap);
    setLoading(false);
  }, [userId, month]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const toggleExtra = (key: string) => {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeCategories =
    extras.size > 0
      ? EXTRA_CATEGORIES.filter((c) => extras.has(c.key))
      : FIXED_CATEGORIES;

  const daysInMonth = month.daysInMonth();
  const today = dayjs();
  const isCurrentMonth = month.isSame(today, "month");

  const completeDays = Array.from(data.entries()).filter(([date, d]) => {
    if (isCurrentMonth && dayjs(date).isAfter(today, "day")) return false;
    return activeCategories.every((c) => d[c.key]);
  }).length;

  return (
    <>
      <Card>
        <CardContent>
          <Stack
            direction="row"
            alignItems="flex-start"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: `${palette.verde}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Calendar size={20} color={palette.verde} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600}>Evolução mensal</Typography>
              <Typography fontSize={13} color="text.secondary">
                {completeDays} dia{completeDays !== 1 ? "s" : ""} completo
                {completeDays !== 1 ? "s" : ""}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <IconButton
              size="small"
              onClick={() => setMonth((m) => m.subtract(1, "month"))}
            >
              <ChevronLeft size={18} color={palette.cinza} />
            </IconButton>
            <Typography
              fontSize={13}
              fontWeight={600}
              sx={{
                minWidth: 120,
                textAlign: "center",
              }}
            >
              {month
                .format("MMMM [de] YYYY")
                .replace(/^\w/, (c) => c.toUpperCase())}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setMonth((m) => m.add(1, "month"))}
              disabled={month.isSame(today, "month")}
            >
              <ChevronRight
                size={18}
                color={
                  month.isSame(today, "month")
                    ? "rgba(0,0,0,0.15)"
                    : palette.cinza
                }
              />
            </IconButton>
          </Stack>

          <Stack
            direction="row"
            spacing={0.8}
            sx={{ mb: 2.5 }}
            flexWrap="wrap"
            useFlexGap
            justifyContent="center"
          >
            {EXTRA_CATEGORIES.map((c) => {
              const active = extras.has(c.key);
              const Icon = c.icon;
              return (
                <Chip
                  key={c.key}
                  icon={<Icon size={13} color={active ? "#fff" : c.color} />}
                  label={c.label}
                  size="small"
                  onClick={() => toggleExtra(c.key)}
                  sx={{
                    bgcolor: active ? c.color : "rgba(0,0,0,0.04)",
                    color: active ? "#fff" : palette.texto,
                    fontWeight: active ? 600 : 500,
                    fontSize: 11,
                    height: 24,
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </Stack>

          {loading ? (
            <Typography fontSize={12} color="text.secondary" textAlign="center">
              Carregando...
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "10px 4px",
              }}
            >
              {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                <Typography
                  key={i}
                  fontSize={9}
                  color="text.secondary"
                  textAlign="center"
                  fontWeight={600}
                >
                  {d}
                </Typography>
              ))}

              {(() => {
                const firstDay = month.date(1).day();
                const offset = firstDay === 0 ? 6 : firstDay - 1;
                return Array.from({ length: offset }).map((_, i) => (
                  <Box key={`empty-${i}`} />
                ));
              })()}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const date = month.date(d).format("YYYY-MM-DD");
                const isFuture =
                  isCurrentMonth && dayjs(date).isAfter(today, "day");
                const dayData = data.get(date);
                const isToday = isCurrentMonth && d === today.date();
                const achievedLabels = activeCategories
                  .filter((c) => dayData?.[c.key])
                  .map((c) => c.label);

                return (
                  <Box
                    key={d}
                    onClick={() =>
                      !isFuture && setSelectedDay({ date, day: d })
                    }
                    sx={{
                      textAlign: "center",
                      transition: "transform 0.15s",
                      cursor: isFuture ? "default" : "pointer",
                      "&:hover": {
                        transform: isFuture ? "none" : "scale(1.1)",
                      },
                    }}
                    title={
                      isFuture
                        ? undefined
                        : `Dia ${d}: ${achievedLabels.length}/${activeCategories.length}${achievedLabels.length ? ` (${achievedLabels.join(", ")})` : ""}`
                    }
                  >
                    <Typography
                      fontSize={10.5}
                      fontWeight={isToday ? 800 : 500}
                      color={
                        isFuture
                          ? "rgba(0,0,0,0.25)"
                          : isToday
                            ? palette.verde
                            : "text.secondary"
                      }
                      sx={{ mb: 0.4 }}
                    >
                      {d}
                    </Typography>

                    {isFuture ? (
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          mx: "auto",
                          borderRadius: "50%",
                          border: "1px dashed rgba(0,0,0,0.12)",
                        }}
                      />
                    ) : (
                      <DayRingBadge
                        dayData={dayData}
                        categories={activeCategories}
                        isToday={isToday}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(0,0,0,0.06)" }}
            flexWrap="wrap"
            useFlexGap
            justifyContent="center"
          >
            {activeCategories.map((c) => (
              <Stack
                key={c.key}
                direction="row"
                alignItems="center"
                spacing={0.7}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: c.color,
                    flexShrink: 0,
                  }}
                />
                <Typography fontSize={11.5} color="text.secondary">
                  {c.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Modal de detalhe do dia */}
      <Dialog
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogContent sx={{ p: 3, position: "relative" }}>
          <IconButton
            size="small"
            onClick={() => setSelectedDay(null)}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <X size={18} />
          </IconButton>
          {selectedDay &&
            (() => {
              const dayData = data.get(selectedDay.date);
              const detail = details.get(selectedDay.date);
              const achieved = activeCategories.filter(
                (c) => dayData?.[c.key],
              ).length;
              const total = activeCategories.length;

              const getProgress = (cat: CategoryConfig): number => {
                if (!detail) return 0;
                switch (cat.key) {
                  case "water":
                    return Math.min(1, detail.waterMl / WATER_GOAL);
                  case "exercise":
                    return detail.exerciseMin > 0 ? 1 : 0;
                  case "sleep":
                    return Math.min(1, detail.sleepHours / 8);
                  case "meals":
                    return detail.mealsTotal > 0
                      ? Math.min(1, detail.mealsCount / detail.mealsTotal)
                      : 0;
                  case "study":
                    return detail.studyMin > 0 ? 1 : 0;
                  case "challenge":
                    return detail.challengesTotal > 0
                      ? Math.min(
                          1,
                          detail.challengesDone / detail.challengesTotal,
                        )
                      : 0;
                  case "habit":
                    return detail.habitsTotal > 0
                      ? Math.min(1, detail.habitsDone / detail.habitsTotal)
                      : 0;
                  default:
                    return 0;
                }
              };

              const getLabel = (cat: CategoryConfig): string => {
                if (!detail) return "—";
                switch (cat.key) {
                  case "water":
                    return `${detail.waterMl}/${WATER_GOAL}ml`;
                  case "exercise":
                    return detail.exerciseMin > 0
                      ? `${detail.exerciseMin}min`
                      : "—";
                  case "sleep":
                    return detail.sleepHours > 0
                      ? `${detail.sleepHours}/8h`
                      : "—";
                  case "meals":
                    return `${detail.mealsCount}/${detail.mealsTotal}`;
                  case "study":
                    return detail.studyMin > 0
                      ? `${Math.floor(detail.studyMin / 60)}h${detail.studyMin % 60 > 0 ? `${detail.studyMin % 60}min` : ""}`
                      : "—";
                  case "challenge":
                    return detail.challengesTotal > 0
                      ? `${detail.challengesDone}/${detail.challengesTotal}`
                      : "—";
                  case "habit":
                    return detail.habitsTotal > 0
                      ? `${detail.habitsDone}/${detail.habitsTotal}`
                      : "—";
                  default:
                    return "—";
                }
              };

              return (
                <>
                  <Typography
                    fontWeight={700}
                    fontSize={16}
                    textAlign="center"
                    sx={{ mb: 0.5 }}
                  >
                    Dia {selectedDay.day} · {achieved}/{total}
                  </Typography>
                  <Typography
                    fontSize={12}
                    color="text.secondary"
                    textAlign="center"
                    sx={{ mb: 2.5 }}
                  >
                    {(() => {
                      const formatted = month
                        .date(selectedDay.day)
                        .format("dddd, D [de] MMMM");
                      const capitalized =
                        formatted.charAt(0).toUpperCase() + formatted.slice(1);
                      return capitalized.replace(
                        /de (\w)/,
                        (_, c) => `de ${c.toUpperCase()}`,
                      );
                    })()}
                  </Typography>

                  {/* Anéis grandes com progresso proporcional */}
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}
                  >
                    <svg viewBox="0 0 120 120" width={120} height={120}>
                      {activeCategories.map((cat, i) => {
                        const radius = 52 - i * 12;
                        const circumference = 2 * Math.PI * radius;
                        const progress = getProgress(cat);
                        return (
                          <g key={cat.key}>
                            <circle
                              cx="60"
                              cy="60"
                              r={radius}
                              fill="none"
                              stroke="rgba(0,0,0,0.06)"
                              strokeWidth={8}
                            />
                            {progress > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="none"
                                stroke={cat.color}
                                strokeWidth={8}
                                strokeLinecap="round"
                                strokeDasharray={`${circumference * progress} ${circumference}`}
                                transform="rotate(-90 60 60)"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </Box>

                  {/* Lista de categorias com valores */}
                  <Stack spacing={1.2}>
                    {activeCategories.map((cat) => {
                      const progress = getProgress(cat);
                      const label = getLabel(cat);
                      return (
                        <Stack
                          key={cat.key}
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                        >
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              bgcolor:
                                progress > 0 ? cat.color : "rgba(0,0,0,0.1)",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            fontSize={13}
                            sx={{ flex: 1 }}
                            color={
                              progress > 0 ? "text.primary" : "text.secondary"
                            }
                          >
                            {cat.label}
                          </Typography>
                          <Typography
                            fontSize={12}
                            fontWeight={600}
                            color={
                              progress >= 1
                                ? cat.color
                                : progress > 0
                                  ? "text.primary"
                                  : "text.disabled"
                            }
                          >
                            {label}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
