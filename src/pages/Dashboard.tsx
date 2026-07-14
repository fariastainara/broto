import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  Chip,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Droplets,
  Flame,
  Target,
  CheckSquare,
  BookOpen,
  Moon,
  Smile,
  Laugh,
  Meh,
  Frown,
  Angry,
  ListChecks,
  Sprout,
  Repeat,
  Utensils,
  Dumbbell,
  Heart,
  Sparkles,
  TrendingUp,
  Scale,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import PageHeader from "../components/PageHeader";
import BrotoLoader from "../components/BrotoLoader";
import MonthlyProgress from "../components/MonthlyProgress";
import MealPlanCard from "../components/MealPlanCard";
import type {
  Task,
  Challenge,
  ChallengeCheckin,
  WaterLog,
  WeightLog,
  Profile,
  StudySession,
  HabitLog,
  Habit,
  Goal,
  MoodLog,
  SleepLog,
  MealLog,
  Exercise,
} from "../types";

dayjs.locale("pt-br");

const DEFAULT_WATER_GOAL = 2800;
const DEFAULT_SLEEP_GOAL = 8;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [waterGoal, setWaterGoal] = useState(DEFAULT_WATER_GOAL);
  const [sleepGoal, setSleepGoal] = useState(DEFAULT_SLEEP_GOAL);
  const [waterToday, setWaterToday] = useState(0);
  const [waterWeek, setWaterWeek] = useState<{ day: string; ml: number }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [checkins, setCheckins] = useState<ChallengeCheckin[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [studyMins, setStudyMins] = useState(0);
  const [studyWeek, setStudyWeek] = useState<{ day: string; min: number }[]>(
    [],
  );
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [moodLog, setMoodLog] = useState<MoodLog | null>(null);
  const [moodMonth, setMoodMonth] = useState<MoodLog[]>([]);
  const [sleepLog, setSleepLog] = useState<SleepLog | null>(null);
  const [sleepWeek, setSleepWeek] = useState<{ day: string; hours: number }[]>(
    [],
  );
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseWeek, setExerciseWeek] = useState<
    { day: string; min: number }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    const today = dayjs().format("YYYY-MM-DD");
    const startOfDay = dayjs(today).startOf("day").toISOString();
    const endOfDay = dayjs(today).endOf("day").toISOString();
    // Semana atual: segunda a domingo
    const dayOfWeek = dayjs().day(); // 0=dom, 1=seg...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = dayjs()
      .subtract(mondayOffset, "day")
      .format("YYYY-MM-DD");

    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay),
      supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", dayjs(weekStart).startOf("day").toISOString()),
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "ativa")
        .order("created_at", { ascending: false }),
      supabase.from("challenges").select("*").eq("user_id", user.id),
      supabase.from("challenge_checkins").select("*").eq("user_id", user.id),
      supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_date", { ascending: false })
        .limit(7),
      supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("started_at", dayjs(weekStart).startOf("day").toISOString()),
      supabase.from("habits").select("*").eq("user_id", user.id),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", today),
      supabase
        .from("mood_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", today)
        .maybeSingle(),
      supabase
        .from("mood_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_date", dayjs().startOf("month").format("YYYY-MM-DD"))
        .lte("logged_date", dayjs().endOf("month").format("YYYY-MM-DD")),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", today)
        .maybeSingle(),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_date", weekStart),
      supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay),
      supabase
        .from("exercises")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", dayjs(weekStart).startOf("day").toISOString()),
      supabase
        .from("user_settings")
        .select("water_goal_ml, sleep_goal_hours")
        .eq("id", user.id)
        .maybeSingle(),
    ]).then(
      // @ts-ignore - more than 16 promises
      ([
        profileRes,
        waterTodayRes,
        waterWeekRes,
        tasksRes,
        goalsRes,
        challengesRes,
        checkinsRes,
        weightsRes,
        studyRes,
        habitsRes,
        habitLogsRes,
        moodRes,
        moodMonthRes,
        sleepRes,
        sleepWeekRes,
        mealsRes,
        exercisesRes,
        settingsRes,
      ]) => {
        if (profileRes.data) setProfile(profileRes.data as Profile);

        if (settingsRes.data) {
          if (settingsRes.data.water_goal_ml) setWaterGoal(settingsRes.data.water_goal_ml);
          if (settingsRes.data.sleep_goal_hours) setSleepGoal(settingsRes.data.sleep_goal_hours);
        }

        const todayWater = ((waterTodayRes.data ?? []) as WaterLog[]).reduce(
          (acc, w) => acc + w.amount_ml,
          0,
        );
        setWaterToday(todayWater);

        const weekLogs = (waterWeekRes.data ?? []) as WaterLog[];
        const days: { day: string; ml: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = dayjs(weekStart).add(i, "day");
          const dayStr = d.format("YYYY-MM-DD");
          const ml = weekLogs
            .filter((l) => dayjs(l.logged_at).format("YYYY-MM-DD") === dayStr)
            .reduce((acc, w) => acc + w.amount_ml, 0);
          days.push({ day: d.format("ddd"), ml });
        }
        setWaterWeek(days);

        setTasks((tasksRes.data ?? []) as Task[]);
        setGoals((goalsRes.data ?? []) as Goal[]);
        setChallenges((challengesRes.data ?? []) as Challenge[]);
        setCheckins((checkinsRes.data ?? []) as ChallengeCheckin[]);
        setWeights(((weightsRes.data ?? []) as WeightLog[]).reverse());

        const sessions = (studyRes.data ?? []) as StudySession[];
        const todaySessions = sessions.filter(
          (s) => dayjs(s.started_at).format("YYYY-MM-DD") === today,
        );
        setStudyMins(
          todaySessions.reduce(
            (acc, s) =>
              acc + dayjs(s.ended_at).diff(dayjs(s.started_at), "minute"),
            0,
          ),
        );

        const studyDays: { day: string; min: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = dayjs(weekStart).add(i, "day");
          const dayStr = d.format("YYYY-MM-DD");
          const mins = sessions
            .filter((s) => dayjs(s.started_at).format("YYYY-MM-DD") === dayStr)
            .reduce(
              (acc, s) =>
                acc + dayjs(s.ended_at).diff(dayjs(s.started_at), "minute"),
              0,
            );
          studyDays.push({ day: d.format("ddd"), min: mins });
        }
        setStudyWeek(studyDays);

        setHabits((habitsRes.data ?? []) as Habit[]);
        setHabitLogs((habitLogsRes.data ?? []) as HabitLog[]);
        setMoodLog((moodRes.data as MoodLog) ?? null);
        setMoodMonth((moodMonthRes.data ?? []) as MoodLog[]);
        setSleepLog((sleepRes.data as SleepLog) ?? null);

        const sleepLogs = (sleepWeekRes.data ?? []) as SleepLog[];
        const sleepDays: { day: string; hours: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = dayjs(weekStart).add(i, "day");
          const dayStr = d.format("YYYY-MM-DD");
          const sl = sleepLogs.find((s) => s.logged_date === dayStr);
          let hrs = 0;
          if (sl) {
            let slept = dayjs(sl.slept_at);
            const woke = dayjs(sl.woke_at);
            if (woke.isBefore(slept)) slept = slept.subtract(1, "day");
            hrs = Math.round((woke.diff(slept, "minute") / 60) * 10) / 10;
          }
          sleepDays.push({ day: d.format("ddd"), hours: hrs });
        }
        setSleepWeek(sleepDays);
        setMeals((mealsRes.data ?? []) as MealLog[]);

        const exData = (exercisesRes.data ?? []) as Exercise[];
        setExercises(exData);
        const exDays: { day: string; min: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = dayjs(weekStart).add(i, "day");
          const dayStr = d.format("YYYY-MM-DD");
          const mins = exData
            .filter((e) => dayjs(e.logged_at).format("YYYY-MM-DD") === dayStr)
            .reduce((acc, e) => acc + e.duration_min, 0);
          exDays.push({ day: d.format("ddd"), min: mins });
        }
        setExerciseWeek(exDays);

        setLoading(false);
      },
    );
  }, [user]);

  if (loading) {
    return <BrotoLoader label="Preparando seu dashboard" fullScreen={false} />;
  }

  const waterPct = Math.min(
    100,
    Math.round((waterToday / waterGoal) * 100),
  );
  const todayStr = dayjs().format("YYYY-MM-DD");
  const latestWeight =
    weights.length > 0 ? weights[weights.length - 1].weight_kg : null;
  const pendingTasks = tasks.filter(
    (t) => t.status === "pendente" || t.status === "em_andamento",
  ).length;
  const taskListsCount = new Set(
    tasks
      .filter((t) => t.status === "pendente" || t.status === "em_andamento")
      .map((t) => t.category),
  ).size;
  const doneTasks = tasks.filter((t) => t.status === "concluida").length;
  const studyHours = Math.round((studyMins / 60) * 10) / 10;
  const habitsDone = habitLogs.length;
  const habitsTotal = habits.length;

  const profileFields = profile
    ? [
        profile.name,
        profile.birth_date,
        profile.weight_kg,
        profile.height_cm,
        profile.avatar_url,
      ]
    : [];
  const profilePct = profile
    ? Math.round((profileFields.filter(Boolean).length / 5) * 100)
    : 0;

  const hour = dayjs().hour();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const userName = (() => {
    const raw =
      profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  function sleepHours(): string {
    if (!sleepLog) return "";
    let slept = dayjs(sleepLog.slept_at);
    const woke = dayjs(sleepLog.woke_at);
    if (woke.isBefore(slept)) slept = slept.subtract(1, "day");
    const diff = woke.diff(slept, "minute");
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h${m > 0 ? `${m}min` : ""}`;
  }

  function getMoodInsight(entries: MoodLog[]): {
    message: string;
    icon: LucideIcon;
  } {
    const total = entries.length;
    if (total === 0) {
      return {
        message:
          "Registre seu humor hoje pra começar a acompanhar como o mês está indo.",
        icon: Sparkles,
      };
    }
    const counts = entries.reduce<Record<string, number>>((acc, m) => {
      acc[m.mood] = (acc[m.mood] ?? 0) + 1;
      return acc;
    }, {});
    const positive = (counts.excelente ?? 0) + (counts.bom ?? 0);
    const negative = (counts.ruim ?? 0) + (counts.pessimo ?? 0);
    if (total >= 5 && negative / total >= 0.5) {
      return {
        message:
          "Esse mês teve bastante dias difíceis. Tudo bem não estar bem sempre. Se fizer sentido, conversar com alguém de confiança ou buscar apoio profissional pode ajudar.",
        icon: Heart,
      };
    }
    if (total >= 5 && positive / total >= 0.6) {
      return {
        message:
          "Esse mês está sendo leve pra você. Continue registrando pra manter esse acompanhamento 🌱",
        icon: Sparkles,
      };
    }
    return {
      message:
        "Seu humor tem variado esse mês. Continue registrando pra enxergar os padrões com o tempo.",
      icon: TrendingUp,
    };
  }

  return (
    <Box pb={6}>
      <PageHeader
        eyebrow={`${greeting},`}
        title={userName}
        subtitle={dayjs()
          .format("dddd, D [de] MMMM")
          .replace(/^\w/, (c) => c.toUpperCase())}
      />

      {/* Banner completar perfil */}
      {profile && profilePct < 100 && (
        <Box
          onClick={() => navigate("/perfil")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.8,
            bgcolor: "rgba(216,243,220,0.5)",
            border: "1px solid rgba(45,106,79,0.12)",
            borderRadius: 1,
            px: 2.2,
            py: 1.6,
            mb: 2.5,
            cursor: "pointer",
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              bgcolor: palette.menta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sprout size={18} color={palette.verde} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontSize={13.5} fontWeight={600} color={palette.verde}>
              Complete seu perfil
            </Typography>
            <LinearProgress
              variant="determinate"
              value={profilePct}
              sx={{
                mt: 0.5,
                height: 5,
                borderRadius: 3,
                bgcolor: "rgba(45,106,79,0.12)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: palette.verde,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
          <Typography
            fontSize={14}
            fontWeight={700}
            color={palette.verde}
            sx={{ flexShrink: 0 }}
          >
            {profilePct}%
          </Typography>
        </Box>
      )}

      {/* Resumo do dia em chips */}
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
          onClick={() => navigate("/diario")}
          sx={{
            bgcolor: palette.menta,
            color: palette.verde,
            fontWeight: 600,
            cursor: "pointer",
          }}
        />
        {habitsTotal > 0 && (
          <Chip
            icon={<Repeat size={14} color={palette.verdeClaro} />}
            label={`${habitsDone}/${habitsTotal} hábitos`}
            onClick={() => navigate("/diario")}
            sx={{
              bgcolor: palette.menta,
              color: palette.verdeClaro,
              fontWeight: 600,
              cursor: "pointer",
            }}
          />
        )}
        {sleepLog && (
          <Chip
            icon={<Moon size={14} color={palette.cinza} />}
            label={sleepHours()}
            onClick={() => navigate("/diario")}
            sx={{
              bgcolor: "rgba(107,114,128,0.1)",
              color: palette.cinza,
              fontWeight: 600,
              cursor: "pointer",
            }}
          />
        )}
        {studyMins > 0 && (
          <Chip
            icon={<BookOpen size={14} color="#6366F1" />}
            label={`${studyHours}h estudo`}
            onClick={() => navigate("/estudos")}
            sx={{
              bgcolor: "rgba(99,102,241,0.1)",
              color: "#6366F1",
              fontWeight: 600,
              cursor: "pointer",
            }}
          />
        )}
      </Stack>

      <Stack spacing={2.5}>
        {/* HIDRATAÇÃO */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/diario")}>
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
                <Typography fontWeight={600}>Hidratação</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {waterToday}ml de {waterGoal}ml
                </Typography>
              </Box>
              <Typography fontSize={14} fontWeight={700} color={palette.verde}>
                {waterPct}%
              </Typography>
            </Stack>
            <Box sx={{ pl: 7, mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={waterPct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: palette.menta,
                  "& .MuiLinearProgress-bar": {
                    bgcolor: palette.verdeClaro,
                    borderRadius: 4,
                  },
                }}
              />
              {waterWeek.length > 0 && (
                <Box sx={{ height: 80, mt: 1.5 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waterWeek}>
                      <defs>
                        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={palette.verdeClaro}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={palette.verdeClaro}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => [`${v}ml`, "Água"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="ml"
                        stroke={palette.verdeClaro}
                        fill="url(#wg)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* EXERCÍCIOS */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/diario")}>
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
                  {(() => {
                    const todayMins =
                      exerciseWeek.find((d) => d.day === dayjs().format("ddd"))
                        ?.min ?? 0;
                    if (todayMins === 0) return "Nenhum exercício hoje";
                    const h = Math.floor(todayMins / 60);
                    const m = todayMins % 60;
                    return h > 0
                      ? `${h}h${m > 0 ? `${m}min` : ""} hoje`
                      : `${m}min hoje`;
                  })()}
                </Typography>
              </Box>
              {(() => {
                const todayMins =
                  exerciseWeek.find((d) => d.day === dayjs().format("ddd"))
                    ?.min ?? 0;
                if (todayMins === 0) return null;
                const h = Math.floor(todayMins / 60);
                const m = todayMins % 60;
                return (
                  <Typography
                    fontSize={14}
                    fontWeight={700}
                    color={palette.verdeClaro}
                  >
                    {h > 0 ? `${h}h${m > 0 ? m : ""}` : `${m}min`}
                  </Typography>
                );
              })()}
            </Stack>
            <Box sx={{ pl: 7, mt: 1.5, height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={exerciseWeek}>
                  <defs>
                    <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={palette.verdeClaro}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={palette.verdeClaro}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}min`, "Exercício"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="min"
                    stroke={palette.verdeClaro}
                    fill="url(#eg)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* SONO */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/diario")}>
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
                  {sleepLog ? sleepHours() + " hoje" : "Sem registro hoje"}
                </Typography>
              </Box>
              {sleepLog && (
                <Typography
                  fontSize={14}
                  fontWeight={700}
                  color={palette.cinza}
                >
                  {sleepHours()}
                </Typography>
              )}
            </Stack>
            <Box sx={{ pl: 7, mt: 1.5, height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sleepWeek}>
                  <defs>
                    <linearGradient id="slg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={palette.cinza}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={palette.cinza}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}h`, "Sono"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke={palette.cinza}
                    fill="url(#slg)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* HUMOR MENSAL */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/diario")}>
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
                <Smile size={20} color={palette.verdeClaro} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Humor</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {dayjs()
                    .format("MMMM")
                    .replace(/^\w/, (c) => c.toUpperCase())}{" "}
                  · {moodMonth.length} dia{moodMonth.length !== 1 ? "s" : ""}{" "}
                  registrado{moodMonth.length !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ pl: 7, mt: 1.5 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                {(() => {
                  const daysInMonth = dayjs().daysInMonth();
                  const moodConfig: Record<
                    string,
                    { color: string; icon: LucideIcon }
                  > = {
                    excelente: { color: palette.verde, icon: Laugh },
                    bom: { color: palette.verdeClaro, icon: Smile },
                    normal: { color: palette.cinza, icon: Meh },
                    ruim: { color: "#D9A441", icon: Frown },
                    pessimo: { color: palette.laranja, icon: Angry },
                  };
                  const today = dayjs();
                  const dots = [];
                  for (let d = 1; d <= daysInMonth; d++) {
                    const date = dayjs().date(d).format("YYYY-MM-DD");
                    const mood = moodMonth.find((m) => m.logged_date === date);
                    const isFuture = dayjs().date(d).isAfter(today, "day");
                    const config = mood ? moodConfig[mood.mood] : null;
                    const MoodIcon = config?.icon;
                    dots.push(
                      <Box
                        key={d}
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          bgcolor: config
                            ? config.color
                            : isFuture
                              ? "transparent"
                              : "rgba(0,0,0,0.06)",
                          border: isFuture
                            ? "1px dashed rgba(0,0,0,0.1)"
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "transform 0.15s",
                          "&:hover": { transform: "scale(1.15)" },
                        }}
                        title={mood ? `Dia ${d}: ${mood.mood}` : `Dia ${d}`}
                      >
                        {MoodIcon && (
                          <MoodIcon size={14} color="#fff" strokeWidth={2.5} />
                        )}
                      </Box>,
                    );
                  }
                  return dots;
                })()}
              </Box>
              {/* Legenda */}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 1.5 }}
                flexWrap="wrap"
                useFlexGap
                justifyContent="center"
              >
                {(
                  [
                    {
                      label: "Excelente",
                      color: palette.verde,
                      key: "excelente",
                      icon: Laugh,
                    },
                    {
                      label: "Bom",
                      color: palette.verdeClaro,
                      key: "bom",
                      icon: Smile,
                    },
                    {
                      label: "Normal",
                      color: palette.cinza,
                      key: "normal",
                      icon: Meh,
                    },
                    {
                      label: "Ruim",
                      color: "#D9A441",
                      key: "ruim",
                      icon: Frown,
                    },
                    {
                      label: "Péssimo",
                      color: palette.laranja,
                      key: "pessimo",
                      icon: Angry,
                    },
                  ] as const
                ).map(({ label, color, key, icon: Icon }) => {
                  const count = moodMonth.filter((m) => m.mood === key).length;
                  return (
                    <Stack
                      key={label}
                      direction="column"
                      alignItems="center"
                      spacing={0.3}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          bgcolor: count > 0 ? color : "rgba(0,0,0,0.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon
                          size={16}
                          color={count > 0 ? "#fff" : color}
                          strokeWidth={2}
                        />
                      </Box>
                      <Typography fontSize={9} color="text.secondary">
                        {label} {count > 0 && `(${count})`}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
              {/* Insight do mês */}
              {(() => {
                const { message, icon: Icon } = getMoodInsight(moodMonth);
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.2,
                      bgcolor: "rgba(216,243,220,0.4)",
                      borderRadius: 1,
                      px: 1.8,
                      py: 1.3,
                      mt: 1.5,
                    }}
                  >
                    <Icon
                      size={16}
                      color={palette.verde}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <Typography
                      fontSize={12.5}
                      color={palette.verde}
                      sx={{ lineHeight: 1.5 }}
                    >
                      {message}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          </CardContent>
        </Card>

        {/* HÁBITOS + REFEIÇÕES lado a lado */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {habitsTotal > 0 && (
            <Card
              sx={{ flex: 1, cursor: "pointer" }}
              onClick={() => navigate("/diario")}
            >
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
                    <Repeat size={20} color={palette.verdeClaro} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>Hábitos</Typography>
                    <Typography fontSize={13} color="text.secondary">
                      {habitsDone}/{habitsTotal} hoje
                    </Typography>
                  </Box>
                </Stack>
                {habits.length > 0 && (
                  <Stack sx={{ mt: 1.5, pl: 7 }}>
                    {habits.slice(0, 4).map((h) => {
                      const done = habitLogs.some((hl) => hl.habit_id === h.id);
                      return (
                        <Typography
                          key={h.id}
                          fontSize={13}
                          sx={{
                            py: 0.3,
                            textDecoration: done ? "line-through" : "none",
                            color: done ? "text.secondary" : "text.primary",
                          }}
                        >
                          {done ? "✓" : "○"} {h.title}
                        </Typography>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}

          {meals.length > 0 && (
            <Card
              sx={{ flex: 1, cursor: "pointer" }}
              onClick={() => navigate("/diario")}
            >
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
                    <Utensils size={20} color={palette.laranja} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>Refeições</Typography>
                    <Typography fontSize={13} color="text.secondary">
                      {meals.length} registrada{meals.length !== 1 ? "s" : ""}{" "}
                      hoje
                    </Typography>
                  </Box>
                </Stack>
                <Stack sx={{ mt: 1.5, pl: 7 }}>
                  {meals.slice(0, 3).map((m) => (
                    <Typography
                      key={m.id}
                      fontSize={13}
                      color="text.secondary"
                      sx={{ py: 0.3 }}
                    >
                      • {m.description?.split(" – ")[0] || m.description}
                    </Typography>
                  ))}
                  {meals.length > 3 && (
                    <Typography
                      fontSize={12}
                      color={palette.laranja}
                      fontWeight={600}
                      sx={{ mt: 0.5 }}
                    >
                      +{meals.length - 3} mais
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>

        {/* ESTUDOS */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/estudos")}>
          <CardContent>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: "#6366F1" + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BookOpen size={20} color="#6366F1" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Estudos</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {studyMins > 0
                    ? `${studyHours}h hoje`
                    : "Nenhuma sessão hoje"}
                </Typography>
              </Box>
              {studyMins > 0 && (
                <Typography fontSize={14} fontWeight={700} color="#6366F1">
                  {studyHours}h
                </Typography>
              )}
            </Stack>
            {studyWeek.some((d) => d.min > 0) && (
              <Box sx={{ pl: 7, mt: 1.5, height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={studyWeek}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#6366F1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366F1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${v}min`, "Estudo"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="min"
                      stroke="#6366F1"
                      fill="url(#sg)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* TAREFAS + METAS lado a lado */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Card
            sx={{ flex: 1, cursor: "pointer" }}
            onClick={() => navigate("/tarefas")}
          >
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
                  <ListChecks size={20} color={palette.verde} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600}>Tarefas</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {pendingTasks} pendente{pendingTasks !== 1 ? "s" : ""} em{" "}
                    {taskListsCount} lista{taskListsCount !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              </Stack>
              {pendingTasks > 0 && (
                <Stack sx={{ mt: 1.5, pl: 7 }}>
                  {tasks
                    .filter((t) => t.status === "pendente")
                    .slice(0, 3)
                    .map((t) => (
                      <Typography
                        key={t.id}
                        fontSize={13}
                        color="text.secondary"
                        sx={{ py: 0.3 }}
                      >
                        • {t.title}
                      </Typography>
                    ))}
                  {pendingTasks > 3 && (
                    <Typography
                      fontSize={12}
                      color={palette.verde}
                      fontWeight={600}
                      sx={{ mt: 0.5 }}
                    >
                      +{pendingTasks - 3} mais
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card
            sx={{ flex: 1, cursor: "pointer" }}
            onClick={() => navigate("/metas")}
          >
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
                  <Target size={20} color={palette.verde} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600}>Metas</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {goals.length} ativa{goals.length !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              </Stack>
              {goals.length > 0 && (
                <Stack sx={{ mt: 1.5, pl: 7 }}>
                  {goals.slice(0, 3).map((g) => (
                    <Typography
                      key={g.id}
                      fontSize={13}
                      color="text.secondary"
                      sx={{ py: 0.3 }}
                    >
                      • {g.title}
                    </Typography>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>

        {/* DESAFIOS */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/metas")}>
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
                <Flame size={20} color={palette.laranja} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Desafios</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {challenges.length} ativo{challenges.length !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Stack>
            {challenges.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 1.5, pl: 7 }}
              >
                {challenges.slice(0, 3).map((c) => {
                  const doneToday = !!checkins.find(
                    (k) =>
                      k.challenge_id === c.id && k.checkin_date === todayStr,
                  );
                  return (
                    <Chip
                      key={c.id}
                      label={c.title}
                      size="small"
                      sx={{
                        bgcolor: doneToday ? palette.verdeClaro : palette.menta,
                        color: doneToday ? "#fff" : palette.verde,
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* PESO */}
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/diario")}>
          <CardContent>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: "#EC4899" + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scale size={20} color="#EC4899" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Peso</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {latestWeight
                    ? `${latestWeight} kg`
                    : profile?.weight_kg
                      ? `${profile.weight_kg} kg`
                      : "Sem registro"}
                </Typography>
              </Box>
              {(latestWeight || profile?.weight_kg) && (
                <Typography fontSize={14} fontWeight={700} color="#EC4899">
                  {latestWeight ?? profile?.weight_kg}kg
                </Typography>
              )}
            </Stack>
            <Box sx={{ pl: 7, mt: 1.5, height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(() => {
                    const baseWeight =
                      latestWeight ?? profile?.weight_kg ?? null;
                    const wkStart =
                      dayjs().day() === 0
                        ? dayjs().subtract(6, "day")
                        : dayjs().subtract(dayjs().day() - 1, "day");
                    const days: { day: string; kg: number | null }[] = [];
                    for (let i = 0; i < 7; i++) {
                      const d = wkStart.add(i, "day");
                      const dayStr = d.format("YYYY-MM-DD");
                      const w = weights.find((wt) => wt.logged_date === dayStr);
                      days.push({
                        day: d.format("ddd"),
                        kg: w ? w.weight_kg : null,
                      });
                    }
                    // Se nenhum dia tem peso, usa o baseWeight como linha reta
                    if (days.every((d) => d.kg === null) && baseWeight) {
                      return days.map((d) => ({ ...d, kg: baseWeight }));
                    }
                    return days;
                  })()}
                >
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    hide
                    domain={[
                      (min: number) => Math.max(0, min - 5),
                      (max: number) => max + 5,
                    ]}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}kg`, "Peso"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="kg"
                    stroke="#EC4899"
                    fill="url(#pg)"
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* PLANO ALIMENTAR */}
        {user && <MealPlanCard userId={user.id} />}

        {/* EVOLUÇÃO MENSAL */}
        {user && <MonthlyProgress userId={user.id} />}
      </Stack>
    </Box>
  );
}
