import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Collapse,
  LinearProgress,
  Divider,
  Menu,
  CircularProgress,
} from "@mui/material";
import {
  BookOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  Trash2,
  Play,
  Square,
  Flame,
  Circle,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  Download,
  type LucideIcon,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import PageHeader from "../components/PageHeader";
import BrotoLoader from "../components/BrotoLoader";
import { exportStudiesPdf } from "../lib/exportStudiesPdf";
import type {
  Course,
  CourseModule,
  CourseLesson,
  StudySession,
  CourseStatus,
} from "../types";

dayjs.locale("pt-br");

const COURSE_STATUS_OPTIONS: Record<
  CourseStatus,
  { label: string; icon: LucideIcon; color: string }
> = {
  nao_iniciado: { label: "Não iniciado", icon: Circle, color: palette.cinza },
  em_andamento: {
    label: "Em andamento",
    icon: PlayCircle,
    color: palette.verdeClaro,
  },
  concluido: { label: "Concluído", icon: CheckCircle2, color: palette.verde },
  pausado: { label: "Pausado", icon: PauseCircle, color: palette.cinza },
};

interface CourseWithProgress extends Course {
  completedLessons: number;
  totalLessons: number;
}

export default function Studies() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [statusMenuCourseId, setStatusMenuCourseId] = useState<string | null>(
    null,
  );

  const [courseDialog, setCourseDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    platform: "",
    instructor: "",
    total_hours: "",
    category: "",
    status: "em_andamento" as CourseStatus,
  });

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModuleCourse, setAddingModuleCourse] = useState<string | null>(
    null,
  );

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("");
  const [addingLessonModule, setAddingLessonModule] = useState<string | null>(
    null,
  );
  const [elapsed, setElapsed] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseTitle, setEditingCourseTitle] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");

  const [sessionDialog, setSessionDialog] = useState(false);
  const [freeSession, setFreeSession] = useState(false);
  const [newSession, setNewSession] = useState({
    course_id: "",
    started_at: dayjs().format("YYYY-MM-DDTHH:mm"),
    ended_at: dayjs().format("YYYY-MM-DDTHH:mm"),
    notes: "",
  });

  const [activeSession, setActiveSession] = useState<{
    course_id: string;
    started_at: string;
  } | null>(() => {
    const saved = localStorage.getItem("broto_active_study_session");
    return saved ? JSON.parse(saved) : null;
  });

  const [stopDialog, setStopDialog] = useState(false);
  const [stopNotes, setStopNotes] = useState("");

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStart, setExportStart] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [exportEnd, setExportEnd] = useState(dayjs().format("YYYY-MM-DD"));
  const [exporting, setExporting] = useState(false);

  async function loadCourses() {
    if (!user) return;
    const { data: coursesData } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const coursesList = (coursesData ?? []) as Course[];
    const courseIds = coursesList.map((c) => c.id);
    if (courseIds.length === 0) {
      setCourses([]);
      return;
    }

    const { data: modulesData } = await supabase
      .from("course_modules")
      .select("*")
      .in("course_id", courseIds)
      .order("sort_order", { ascending: true });

    const mods = (modulesData ?? []) as CourseModule[];
    setModules(mods);

    const moduleIds = mods.map((m) => m.id);
    let lessonsAll: CourseLesson[] = [];
    if (moduleIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from("course_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("sort_order", { ascending: true });
      lessonsAll = (lessonsData ?? []) as CourseLesson[];
    }
    setLessons(lessonsAll);

    const withProgress: CourseWithProgress[] = coursesList.map((c) => {
      const cMods = mods.filter((m) => m.course_id === c.id);
      const cModIds = cMods.map((m) => m.id);
      const cLessons = lessonsAll.filter((l) => cModIds.includes(l.module_id));
      return {
        ...c,
        totalLessons: cLessons.length,
        completedLessons: cLessons.filter((l) => l.completed).length,
      };
    });
    setCourses(withProgress);
  }

  async function loadSessions() {
    if (!user) return;
    const today = dayjs().format("YYYY-MM-DD");
    const startOfDay = dayjs(today).startOf("day").toISOString();
    const endOfDay = dayjs(today).endOf("day").toISOString();

    const { data } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("started_at", startOfDay)
      .lte("started_at", endOfDay)
      .order("started_at", { ascending: false });
    setSessions((data ?? []) as StudySession[]);

    const weekAgo = dayjs().subtract(6, "day").startOf("day").toISOString();
    const { data: allData } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("started_at", weekAgo)
      .order("started_at", { ascending: false });
    setAllSessions((allData ?? []) as StudySession[]);
  }

  useEffect(() => {
    Promise.all([loadCourses(), loadSessions()]).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalCourses = courses.length;
  const completedCourses = courses.filter(
    (c) => c.status === "concluido",
  ).length;
  const weekMinutes = allSessions.reduce((acc, s) => {
    return acc + dayjs(s.ended_at).diff(dayjs(s.started_at), "minute");
  }, 0);
  const weekHours = Math.round((weekMinutes / 60) * 10) / 10;

  const studyStreak = (() => {
    const sessionDays = new Set(
      allSessions.map((s) => dayjs(s.started_at).format("YYYY-MM-DD")),
    );
    let streak = 0;
    let day = dayjs();
    while (sessionDays.has(day.format("YYYY-MM-DD"))) {
      streak++;
      day = day.subtract(1, "day");
    }
    return streak;
  })();

  async function handleCreateCourse() {
    if (!user || !newCourse.title.trim()) return;
    setActionBusy(true);
    await supabase.from("courses").insert({
      user_id: user.id,
      title: newCourse.title.trim(),
      description: newCourse.description || null,
      platform: newCourse.platform || null,
      instructor: newCourse.instructor || null,
      total_hours: newCourse.total_hours ? Number(newCourse.total_hours) : null,
      category: newCourse.category || null,
      status: newCourse.status,
    });
    setActionBusy(false);
    setNewCourse({
      title: "",
      description: "",
      platform: "",
      instructor: "",
      total_hours: "",
      category: "",
      status: "em_andamento",
    });
    setCourseDialog(false);
    loadCourses();
  }

  async function handleDeleteCourse(id: string) {
    await supabase.from("courses").delete().eq("id", id);
    if (expandedCourse === id) setExpandedCourse(null);
    loadCourses();
  }

  async function handleUpdateCourseStatus(
    courseId: string,
    newStatus: CourseStatus,
  ) {
    await supabase
      .from("courses")
      .update({ status: newStatus })
      .eq("id", courseId);
    setStatusMenuAnchor(null);
    setStatusMenuCourseId(null);
    loadCourses();
  }

  async function handleAddModule(courseId: string) {
    if (!newModuleTitle.trim()) return;
    setActionBusy(true);
    const courseMods = modules.filter((m) => m.course_id === courseId);
    await supabase.from("course_modules").insert({
      course_id: courseId,
      title: newModuleTitle.trim(),
      sort_order: courseMods.length + 1,
    });
    setActionBusy(false);
    setNewModuleTitle("");
    setAddingModuleCourse(null);
    loadCourses();
  }

  async function handleDeleteModule(id: string) {
    await supabase.from("course_modules").delete().eq("id", id);
    loadCourses();
  }

  async function handleAddLesson(moduleId: string) {
    if (!newLessonTitle.trim()) return;
    setActionBusy(true);
    const modLessons = lessons.filter((l) => l.module_id === moduleId);
    await supabase.from("course_lessons").insert({
      module_id: moduleId,
      title: newLessonTitle.trim(),
      duration_min: newLessonDuration ? Number(newLessonDuration) : null,
      completed: false,
      sort_order: modLessons.length + 1,
    });
    setActionBusy(false);
    setNewLessonTitle("");
    setNewLessonDuration("");
    setAddingLessonModule(null);
    loadCourses();
  }

  async function handleToggleLesson(lesson: CourseLesson) {
    await supabase
      .from("course_lessons")
      .update({ completed: !lesson.completed })
      .eq("id", lesson.id);
    loadCourses();
  }

  async function handleDeleteLesson(id: string) {
    await supabase.from("course_lessons").delete().eq("id", id);
    loadCourses();
  }

  async function saveEditCourse(id: string) {
    if (!editingCourseTitle.trim()) return;
    const newTitle = editingCourseTitle.trim();
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );
    setEditingCourseId(null);
    await supabase.from("courses").update({ title: newTitle }).eq("id", id);
    loadCourses();
  }

  async function saveEditModule(id: string) {
    if (!editingModuleTitle.trim()) return;
    const newTitle = editingModuleTitle.trim();
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, title: newTitle } : m)),
    );
    setEditingModuleId(null);
    await supabase
      .from("course_modules")
      .update({ title: newTitle })
      .eq("id", id);
    loadCourses();
  }

  async function saveEditLesson(id: string) {
    if (!editingLessonTitle.trim()) return;
    const newTitle = editingLessonTitle.trim();
    setLessons((prev) =>
      prev.map((l) => (l.id === id ? { ...l, title: newTitle } : l)),
    );
    setEditingLessonId(null);
    await supabase
      .from("course_lessons")
      .update({ title: newTitle })
      .eq("id", id);
    loadCourses();
  }

  async function handleCreateSession() {
    if (!user) return;
    setActionBusy(true);
    let startedAt = dayjs(newSession.started_at);
    let endedAt = dayjs(newSession.ended_at);
    if (endedAt.isBefore(startedAt) || endedAt.isSame(startedAt)) {
      endedAt = endedAt.add(1, "day");
    }
    await supabase.from("study_sessions").insert({
      user_id: user.id,
      course_id: newSession.course_id || null,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      notes: newSession.notes || null,
    });
    setActionBusy(false);
    setNewSession({
      course_id: "",
      started_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      ended_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      notes: "",
    });
    setFreeSession(false);
    setSessionDialog(false);
    loadSessions();
  }

  function handleStartTimer(courseId: string) {
    const session = {
      course_id: courseId,
      started_at: dayjs().toISOString(),
    };
    setActiveSession(session);
    localStorage.setItem("broto_active_study_session", JSON.stringify(session));
  }

  async function removeSession(id: string) {
    await supabase.from("study_sessions").delete().eq("id", id);
    loadSessions();
  }

  function handleStopTimer() {
    setStopNotes("");
    setStopDialog(true);
  }

  async function confirmStopTimer() {
    if (!user || !activeSession) return;
    setActionBusy(true);
    await supabase.from("study_sessions").insert({
      user_id: user.id,
      course_id: activeSession.course_id || null,
      started_at: activeSession.started_at,
      ended_at: dayjs().toISOString(),
      notes: stopNotes.trim() || null,
    });
    setActionBusy(false);
    setActiveSession(null);
    setStopDialog(false);
    setStopNotes("");
    localStorage.removeItem("broto_active_study_session");
    loadSessions();
  }

  function startFreeTimer() {
    const session = {
      course_id: "",
      started_at: dayjs().toISOString(),
    };
    setActiveSession(session);
    localStorage.setItem("broto_active_study_session", JSON.stringify(session));
  }

  useEffect(() => {
    if (!activeSession) return;
    function updateElapsed() {
      const diff = dayjs().diff(dayjs(activeSession?.started_at), "second");
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}min` : `${m}min ${s}s`);
    }
    updateElapsed();
    const id = setInterval(updateElapsed, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  function getCourseName(id: string | null) {
    if (!id) return "Sessão livre";
    return courses.find((c) => c.id === id)?.title ?? "—";
  }

  if (loading) {
    return <BrotoLoader label="Carregando seus estudos" fullScreen={false} />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <PageHeader
          eyebrow="Estudos"
          title="Meus cursos"
          subtitle={`${totalCourses} curso${totalCourses !== 1 ? "s" : ""} · ${weekHours}h esta semana`}
        />
        <IconButton
          onClick={() => setExportDialogOpen(true)}
          title="Exportar PDF"
        >
          <Download size={20} color={palette.verde} />
        </IconButton>
      </Stack>

      {/* Resumo rápido */}
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 3 }}
      >
        <Chip
          icon={<BookOpen size={14} color={palette.verde} />}
          label={`${totalCourses} curso${totalCourses !== 1 ? "s" : ""}`}
          sx={{ bgcolor: palette.menta, color: palette.verde, fontWeight: 600 }}
        />
        {completedCourses > 0 && (
          <Chip
            icon={<GraduationCap size={14} color="#6366F1" />}
            label={`${completedCourses} concluído${completedCourses !== 1 ? "s" : ""}`}
            sx={{
              bgcolor: "rgba(99,102,241,0.1)",
              color: "#6366F1",
              fontWeight: 600,
            }}
          />
        )}
        {weekHours > 0 && (
          <Chip
            icon={<Clock size={14} color={palette.laranja} />}
            label={`${weekHours}h na semana`}
            sx={{
              bgcolor: "rgba(224,122,58,0.1)",
              color: palette.laranja,
              fontWeight: 600,
            }}
          />
        )}
        {studyStreak > 0 && (
          <Chip
            icon={<Flame size={14} color={palette.verdeClaro} />}
            label={`${studyStreak} dia${studyStreak !== 1 ? "s" : ""} seguido${studyStreak !== 1 ? "s" : ""}`}
            sx={{
              bgcolor: palette.menta,
              color: palette.verdeClaro,
              fontWeight: 600,
            }}
          />
        )}
      </Stack>

      {/* Active timer banner */}
      {activeSession && (
        <Card
          sx={{
            mb: 2.5,
            bgcolor: "rgba(216,243,220,0.5)",
            border: "1px solid rgba(45,106,79,0.15)",
          }}
        >
          <CardContent sx={{ py: "14px !important", px: 2.2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1.5}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ flex: 1, minWidth: 0 }}
              >
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: palette.verdeClaro,
                    flexShrink: 0,
                    animation: "pulseGlow 1.8s infinite",
                    "@keyframes pulseGlow": {
                      "0%, 100%": {
                        boxShadow: `0 0 0 0 ${palette.verdeClaro}80`,
                      },
                      "50%": { boxShadow: `0 0 0 5px ${palette.verdeClaro}00` },
                    },
                  }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: palette.verdeClaro,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      lineHeight: 1.3,
                    }}
                  >
                    Estudando agora
                  </Typography>
                  <Typography
                    fontWeight={600}
                    fontSize={14}
                    color={palette.texto}
                    noWrap
                  >
                    {getCourseName(activeSession.course_id)}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    Início: {dayjs(activeSession.started_at).format("HH:mm")}
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="contained"
                size="small"
                startIcon={!actionBusy ? <Square size={13} /> : undefined}
                onClick={handleStopTimer}
                disabled={actionBusy}
                sx={{
                  bgcolor: palette.laranja,
                  "&:hover": {
                    bgcolor: palette.laranja,
                    filter: "brightness(0.92)",
                  },
                  flexShrink: 0,
                }}
              >
                {actionBusy ? (
                  <CircularProgress size={20} sx={{ color: "white" }} />
                ) : (
                  "Parar"
                )}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack spacing={2.5}>
        {/* SESSÕES DE HOJE */}
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
                <Clock size={20} color={palette.laranja} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Sessões de hoje</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Registre e acompanhe seu tempo de estudo
                </Typography>
              </Box>
              <Stack direction="row" spacing={0}>
                {!activeSession && (
                  <IconButton size="small" onClick={startFreeTimer}>
                    <Play size={18} color={palette.verdeClaro} />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => setSessionDialog(true)}>
                  <Plus size={20} />
                </IconButton>
              </Stack>
            </Stack>

            {sessions.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 3.5,
                  px: 2,
                  mt: 2,
                  border: "1.5px dashed rgba(45,106,79,0.18)",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    bgcolor: palette.menta,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock size={20} color={palette.verde} />
                </Box>
                <Typography
                  fontSize={13.5}
                  fontWeight={600}
                  color={palette.texto}
                >
                  Nenhuma sessão registrada hoje
                </Typography>
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{ maxWidth: 220, mb: 0.5 }}
                >
                  Bons estudos! Registre uma sessão assim que terminar.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={15} />}
                  onClick={() => setSessionDialog(true)}
                  sx={{
                    borderColor: palette.verdeClaro,
                    color: palette.verde,
                    mt: 0.5,
                  }}
                >
                  Registrar sessão
                </Button>
              </Box>
            ) : (
              <Stack divider={<Divider />} sx={{ mt: 2 }}>
                {sessions.map((s) => {
                  const totalMins = dayjs(s.ended_at).diff(
                    dayjs(s.started_at),
                    "minute",
                  );
                  const h = Math.floor(totalMins / 60);
                  const m = totalMins % 60;
                  const duration =
                    h > 0 ? `${h}h${m > 0 ? `${m}min` : ""}` : `${m}min`;
                  return (
                    <Stack key={s.id} gap={0.5} sx={{ py: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600} fontSize={14}>
                            {getCourseName(s.course_id)}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary">
                            {dayjs(s.started_at).format("HH:mm")} –{" "}
                            {dayjs(s.ended_at).format("HH:mm")}
                          </Typography>
                        </Box>
                        <Chip
                          label={duration}
                          size="small"
                          sx={{
                            bgcolor: palette.menta,
                            color: palette.verde,
                            fontWeight: 600,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeSession(s.id)}
                        >
                          <Trash2 size={15} color={palette.cinza} />
                        </IconButton>
                      </Stack>
                      {s.notes && (
                        <Typography fontSize={12} color="text.secondary">
                          {s.notes}
                        </Typography>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* CURSOS */}
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
                <BookOpen size={20} color={palette.verde} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Cursos</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Gerencie seus cursos e acompanhe o progresso
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setCourseDialog(true)}>
                <Plus size={20} />
              </IconButton>
            </Stack>

            {courses.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 3.5,
                  px: 2,
                  mt: 2,
                  border: "1.5px dashed rgba(45,106,79,0.18)",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    bgcolor: palette.menta,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GraduationCap size={20} color={palette.verde} />
                </Box>
                <Typography
                  fontSize={13.5}
                  fontWeight={600}
                  color={palette.texto}
                >
                  Nenhum curso cadastrado
                </Typography>
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{ maxWidth: 220, mb: 0.5 }}
                >
                  Adicione os cursos que você está fazendo pra acompanhar o
                  progresso por aqui.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={15} />}
                  onClick={() => setCourseDialog(true)}
                  sx={{
                    borderColor: palette.verdeClaro,
                    color: palette.verde,
                    mt: 0.5,
                  }}
                >
                  Adicionar curso
                </Button>
              </Box>
            ) : (
              <>
                <Stack divider={<Divider />} sx={{ mt: 2 }}>
                  {courses
                    .filter((c) => c.status !== "concluido")
                    .map((course) => {
                      const isExpanded = expandedCourse === course.id;
                      const progressPct =
                        course.totalLessons > 0
                          ? Math.round(
                              (course.completedLessons / course.totalLessons) *
                                100,
                            )
                          : 0;
                      const courseMods = modules.filter(
                        (m) => m.course_id === course.id,
                      );

                      return (
                        <Box key={course.id} sx={{ py: 1.5 }}>
                          <Stack
                            direction="row"
                            alignItems="flex-start"
                            spacing={1}
                            sx={{ cursor: "pointer" }}
                            onClick={() =>
                              setExpandedCourse(isExpanded ? null : course.id)
                            }
                          >
                            <Box sx={{ pt: 0.3 }}>
                              {isExpanded ? (
                                <ChevronDown size={18} color={palette.cinza} />
                              ) : (
                                <ChevronRight size={18} color={palette.cinza} />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, gap: 1 }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                              >
                                {editingCourseId === course.id ? (
                                  <TextField
                                    variant="standard"
                                    size="small"
                                    value={editingCourseTitle}
                                    onChange={(e) =>
                                      setEditingCourseTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === "Enter")
                                        saveEditCourse(course.id);
                                      if (e.key === "Escape")
                                        setEditingCourseId(null);
                                    }}
                                    onBlur={() => saveEditCourse(course.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    InputProps={{ disableUnderline: true }}
                                    inputProps={{
                                      style: { fontSize: 14, fontWeight: 600 },
                                    }}
                                  />
                                ) : (
                                  <Typography
                                    fontWeight={600}
                                    fontSize={14}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCourseId(course.id);
                                      setEditingCourseTitle(course.title);
                                    }}
                                    sx={{ cursor: "pointer" }}
                                  >
                                    {course.title}
                                  </Typography>
                                )}
                                <Chip
                                  size="small"
                                  label={
                                    COURSE_STATUS_OPTIONS[course.status].label
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusMenuAnchor(e.currentTarget);
                                    setStatusMenuCourseId(course.id);
                                  }}
                                  sx={{
                                    bgcolor:
                                      COURSE_STATUS_OPTIONS[course.status]
                                        .color + "18",
                                    color:
                                      COURSE_STATUS_OPTIONS[course.status]
                                        .color,
                                    fontSize: 11,
                                    height: 22,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    "&:hover": { filter: "brightness(0.92)" },
                                  }}
                                />
                              </Stack>
                              {(course.platform || course.instructor) && (
                                <Typography
                                  fontSize={12}
                                  color="text.secondary"
                                  sx={{ mt: 0.2 }}
                                >
                                  {course.platform}
                                  {course.platform &&
                                    course.instructor &&
                                    " · "}
                                  {course.instructor}
                                </Typography>
                              )}
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.3}>
                              <Typography fontSize={12} color="text.secondary">
                                {course.completedLessons}/{course.totalLessons}{" "}
                                aulas
                              </Typography>
                              <Box sx={{ width: 80 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={progressPct}
                                  sx={{
                                    height: 5,
                                    borderRadius: 3,
                                    bgcolor: "rgba(0,0,0,0.06)",
                                    "& .MuiLinearProgress-bar": {
                                      bgcolor:
                                        progressPct === 100
                                          ? "#6366F1"
                                          : palette.verdeClaro,
                                      borderRadius: 3,
                                    },
                                  }}
                                />
                              </Box>
                            </Stack>
                            <Stack direction="row" spacing={0.5}>
                              {!activeSession && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartTimer(course.id);
                                  }}
                                  title="Iniciar sessão"
                                >
                                  <Play size={15} color={palette.verdeClaro} />
                                </IconButton>
                              )}
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCourse(course.id);
                                }}
                              >
                                <Trash2 size={15} color={palette.cinza} />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <Collapse in={isExpanded}>
                            <Box sx={{ pl: 3.5, pt: 1.5 }}>
                              {courseMods.length === 0 && (
                                <Typography
                                  fontSize={12}
                                  color="text.secondary"
                                  sx={{ mb: 1 }}
                                >
                                  Nenhum módulo ainda.
                                </Typography>
                              )}

                              {courseMods.map((mod) => {
                                const modLessons = lessons.filter(
                                  (l) => l.module_id === mod.id,
                                );
                                const isModExpanded = expandedModule === mod.id;
                                const modCompleted = modLessons.filter(
                                  (l) => l.completed,
                                ).length;
                                return (
                                  <Box key={mod.id} sx={{ mb: 1 }}>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                      sx={{ cursor: "pointer", py: 0.5 }}
                                      onClick={() =>
                                        setExpandedModule(
                                          isModExpanded ? null : mod.id,
                                        )
                                      }
                                    >
                                      {isModExpanded ? (
                                        <ChevronDown
                                          size={15}
                                          color={palette.cinza}
                                        />
                                      ) : (
                                        <ChevronRight
                                          size={15}
                                          color={palette.cinza}
                                        />
                                      )}
                                      {editingModuleId === mod.id ? (
                                        <TextField
                                          variant="standard"
                                          size="small"
                                          value={editingModuleTitle}
                                          onChange={(e) =>
                                            setEditingModuleTitle(
                                              e.target.value,
                                            )
                                          }
                                          onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === "Enter")
                                              saveEditModule(mod.id);
                                            if (e.key === "Escape")
                                              setEditingModuleId(null);
                                          }}
                                          onBlur={() => saveEditModule(mod.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          autoFocus
                                          sx={{ flex: 1 }}
                                          InputProps={{
                                            disableUnderline: true,
                                          }}
                                          inputProps={{
                                            style: {
                                              fontSize: 13,
                                              fontWeight: 600,
                                            },
                                          }}
                                        />
                                      ) : (
                                        <Typography
                                          fontWeight={600}
                                          fontSize={13}
                                          sx={{ flex: 1, cursor: "pointer" }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingModuleId(mod.id);
                                            setEditingModuleTitle(mod.title);
                                          }}
                                        >
                                          {mod.title}
                                        </Typography>
                                      )}
                                      <Typography
                                        fontSize={11}
                                        color="text.secondary"
                                      >
                                        {modCompleted}/{modLessons.length}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteModule(mod.id);
                                        }}
                                      >
                                        <Trash2
                                          size={13}
                                          color={palette.cinza}
                                        />
                                      </IconButton>
                                    </Stack>

                                    <Collapse in={isModExpanded}>
                                      <Box sx={{ pl: 3 }}>
                                        {modLessons.map((lesson) => (
                                          <Stack
                                            key={lesson.id}
                                            direction="row"
                                            alignItems="center"
                                            spacing={0.5}
                                            sx={{ py: 0.3 }}
                                          >
                                            <Checkbox
                                              size="small"
                                              checked={lesson.completed}
                                              onChange={() =>
                                                handleToggleLesson(lesson)
                                              }
                                              sx={{
                                                p: 0.3,
                                                color: palette.verdeClaro,
                                                "&.Mui-checked": {
                                                  color: palette.verde,
                                                },
                                              }}
                                            />
                                            {editingLessonId === lesson.id ? (
                                              <TextField
                                                variant="standard"
                                                size="small"
                                                value={editingLessonTitle}
                                                onChange={(e) =>
                                                  setEditingLessonTitle(
                                                    e.target.value,
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter")
                                                    saveEditLesson(lesson.id);
                                                  if (e.key === "Escape")
                                                    setEditingLessonId(null);
                                                }}
                                                onBlur={() =>
                                                  saveEditLesson(lesson.id)
                                                }
                                                autoFocus
                                                sx={{ flex: 1 }}
                                                InputProps={{
                                                  disableUnderline: true,
                                                }}
                                                inputProps={{
                                                  style: { fontSize: 13 },
                                                }}
                                              />
                                            ) : (
                                              <Typography
                                                fontSize={13}
                                                onClick={() => {
                                                  if (!lesson.completed) {
                                                    setEditingLessonId(
                                                      lesson.id,
                                                    );
                                                    setEditingLessonTitle(
                                                      lesson.title,
                                                    );
                                                  }
                                                }}
                                                sx={{
                                                  flex: 1,
                                                  textDecoration:
                                                    lesson.completed
                                                      ? "line-through"
                                                      : "none",
                                                  color: lesson.completed
                                                    ? "text.secondary"
                                                    : "text.primary",
                                                  cursor: lesson.completed
                                                    ? "default"
                                                    : "pointer",
                                                }}
                                              >
                                                {lesson.title}
                                              </Typography>
                                            )}
                                            {lesson.duration_min && (
                                              <Typography
                                                fontSize={11}
                                                color="text.secondary"
                                              >
                                                {lesson.duration_min}min
                                              </Typography>
                                            )}
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                handleDeleteLesson(lesson.id)
                                              }
                                            >
                                              <Trash2
                                                size={12}
                                                color={palette.cinza}
                                              />
                                            </IconButton>
                                          </Stack>
                                        ))}

                                        {addingLessonModule === mod.id ? (
                                          <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{ mt: 0.5 }}
                                          >
                                            <TextField
                                              size="small"
                                              placeholder="Aula"
                                              value={newLessonTitle}
                                              onChange={(e) =>
                                                setNewLessonTitle(
                                                  e.target.value,
                                                )
                                              }
                                              sx={{ flex: 1 }}
                                            />
                                            <TextField
                                              size="small"
                                              placeholder="Min"
                                              type="number"
                                              value={newLessonDuration}
                                              onChange={(e) =>
                                                setNewLessonDuration(
                                                  e.target.value,
                                                )
                                              }
                                              sx={{ width: 70 }}
                                            />
                                            <Button
                                              size="small"
                                              variant="contained"
                                              onClick={() =>
                                                handleAddLesson(mod.id)
                                              }
                                              disabled={actionBusy}
                                              sx={{ borderRadius: 2 }}
                                            >
                                              {actionBusy ? (
                                                <CircularProgress
                                                  size={20}
                                                  sx={{ color: "white" }}
                                                />
                                              ) : (
                                                "OK"
                                              )}
                                            </Button>
                                            <Button
                                              size="small"
                                              onClick={() =>
                                                setAddingLessonModule(null)
                                              }
                                              sx={{ color: palette.cinza }}
                                            >
                                              ✕
                                            </Button>
                                          </Stack>
                                        ) : (
                                          <Button
                                            size="small"
                                            startIcon={<Plus size={13} />}
                                            onClick={() => {
                                              setAddingLessonModule(mod.id);
                                              setNewLessonTitle("");
                                              setNewLessonDuration("");
                                            }}
                                            sx={{
                                              mt: 0.5,
                                              fontSize: 12,
                                              color: palette.cinza,
                                            }}
                                          >
                                            Aula
                                          </Button>
                                        )}
                                      </Box>
                                    </Collapse>
                                  </Box>
                                );
                              })}

                              {addingModuleCourse === course.id ? (
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{ mt: 1 }}
                                >
                                  <TextField
                                    size="small"
                                    placeholder="Módulo"
                                    value={newModuleTitle}
                                    onChange={(e) =>
                                      setNewModuleTitle(e.target.value)
                                    }
                                    sx={{ flex: 1 }}
                                  />
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleAddModule(course.id)}
                                    disabled={actionBusy}
                                    sx={{ borderRadius: 2 }}
                                  >
                                    {actionBusy ? (
                                      <CircularProgress
                                        size={20}
                                        sx={{ color: "white" }}
                                      />
                                    ) : (
                                      "OK"
                                    )}
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => setAddingModuleCourse(null)}
                                    sx={{ color: palette.cinza }}
                                  >
                                    ✕
                                  </Button>
                                </Stack>
                              ) : (
                                <Button
                                  size="small"
                                  startIcon={<Plus size={13} />}
                                  onClick={() => {
                                    setAddingModuleCourse(course.id);
                                    setNewModuleTitle("");
                                  }}
                                  sx={{
                                    mt: 1,
                                    fontSize: 12,
                                    color: palette.cinza,
                                  }}
                                >
                                  Módulo
                                </Button>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                </Stack>

                {/* Cursos concluídos — colapsável */}
                {courses.filter((c) => c.status === "concluido").length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      onClick={() => setShowCompleted(!showCompleted)}
                      sx={{ cursor: "pointer", py: 1, pl: 1 }}
                    >
                      {showCompleted ? (
                        <ChevronDown size={16} color={palette.cinza} />
                      ) : (
                        <ChevronRight size={16} color={palette.cinza} />
                      )}
                      <CheckCircle2 size={15} color={palette.verdeClaro} />
                      <Typography
                        fontSize={13}
                        fontWeight={600}
                        color="text.secondary"
                      >
                        {courses.filter((c) => c.status === "concluido").length}{" "}
                        concluído
                        {courses.filter((c) => c.status === "concluido")
                          .length !== 1
                          ? "s"
                          : ""}
                      </Typography>
                    </Stack>
                    <Collapse in={showCompleted}>
                      <Stack divider={<Divider />}>
                        {courses
                          .filter((c) => c.status === "concluido")
                          .map((course) => {
                            const isExpanded = expandedCourse === course.id;
                            const progressPct =
                              course.totalLessons > 0
                                ? Math.round(
                                    (course.completedLessons /
                                      course.totalLessons) *
                                      100,
                                  )
                                : 0;
                            const courseMods = modules.filter(
                              (m) => m.course_id === course.id,
                            );

                            return (
                              <Box
                                key={course.id}
                                sx={{ py: 1.5, opacity: 0.7 }}
                              >
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                  sx={{ cursor: "pointer" }}
                                  onClick={() =>
                                    setExpandedCourse(
                                      isExpanded ? null : course.id,
                                    )
                                  }
                                >
                                  <Box sx={{ pt: 0.3 }}>
                                    {isExpanded ? (
                                      <ChevronDown
                                        size={18}
                                        color={palette.cinza}
                                      />
                                    ) : (
                                      <ChevronRight
                                        size={18}
                                        color={palette.cinza}
                                      />
                                    )}
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                    >
                                      <Typography
                                        fontWeight={600}
                                        fontSize={14}
                                        sx={{ textDecoration: "line-through" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCourseId(course.id);
                                          setEditingCourseTitle(course.title);
                                        }}
                                      >
                                        {course.title}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label="Concluído"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setStatusMenuAnchor(e.currentTarget);
                                          setStatusMenuCourseId(course.id);
                                        }}
                                        sx={{
                                          bgcolor: palette.verde + "18",
                                          color: palette.verde,
                                          fontSize: 11,
                                          height: 22,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                      />
                                    </Stack>
                                    {(course.platform || course.instructor) && (
                                      <Typography
                                        fontSize={12}
                                        color="text.secondary"
                                        sx={{ mt: 0.2 }}
                                      >
                                        {course.platform}
                                        {course.platform &&
                                          course.instructor &&
                                          " · "}
                                        {course.instructor}
                                      </Typography>
                                    )}
                                  </Box>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCourse(course.id);
                                    }}
                                  >
                                    <Trash2 size={15} color={palette.cinza} />
                                  </IconButton>
                                </Stack>
                              </Box>
                            );
                          })}
                      </Stack>
                    </Collapse>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Menu: alterar status do curso */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
          setStatusMenuCourseId(null);
        }}
      >
        {(
          Object.entries(COURSE_STATUS_OPTIONS) as [
            CourseStatus,
            { label: string; icon: LucideIcon; color: string },
          ][]
        ).map(([value, { label, icon: Icon, color }]) => (
          <MenuItem
            key={value}
            onClick={() =>
              statusMenuCourseId &&
              handleUpdateCourseStatus(statusMenuCourseId, value)
            }
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Icon size={16} color={color} />
              <span>{label}</span>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

      {/* Dialog: novo curso */}
      <Dialog
        open={courseDialog}
        onClose={() => setCourseDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
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
              <BookOpen size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Novo curso
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Adicione um curso para acompanhar
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack gap={2} sx={{ mt: 2 }}>
            <TextField
              label="Título"
              value={newCourse.title}
              onChange={(e) =>
                setNewCourse({ ...newCourse, title: e.target.value })
              }
              fullWidth
              size="small"
            />
            <TextField
              label="Plataforma"
              value={newCourse.platform}
              onChange={(e) =>
                setNewCourse({ ...newCourse, platform: e.target.value })
              }
              fullWidth
              size="small"
            />
            <TextField
              label="Instrutor"
              value={newCourse.instructor}
              onChange={(e) =>
                setNewCourse({ ...newCourse, instructor: e.target.value })
              }
              fullWidth
              size="small"
            />
            <Stack direction="row" gap={2}>
              <TextField
                label="Categoria"
                value={newCourse.category}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, category: e.target.value })
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Carga horária"
                type="number"
                value={newCourse.total_hours}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, total_hours: e.target.value })
                }
                fullWidth
                size="small"
              />
            </Stack>
            <TextField
              label="Descrição"
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse({ ...newCourse, description: e.target.value })
              }
              multiline
              rows={5}
              fullWidth
              size="small"
            />
            <Stack mt={2}>
              <TextField
                select
                label="Status"
                value={newCourse.status}
                onChange={(e) =>
                  setNewCourse({
                    ...newCourse,
                    status: e.target.value as CourseStatus,
                  })
                }
                fullWidth
                size="medium"
              >
                {(
                  Object.entries(COURSE_STATUS_OPTIONS) as [
                    CourseStatus,
                    { label: string; icon: LucideIcon; color: string },
                  ][]
                ).map(([value, { label, icon: Icon, color }]) => (
                  <MenuItem key={value} value={value}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Icon size={16} color={color} />
                      <span>{label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCourseDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateCourse}
            disabled={!newCourse.title.trim() || actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Adicionar curso"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: registrar sessão */}
      <Dialog
        open={sessionDialog}
        onClose={() => setSessionDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
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
              <Clock size={20} color={palette.laranja} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Registrar sessão
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Registre seu tempo de estudo
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack gap={2} sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={freeSession}
                  onChange={(e) => {
                    setFreeSession(e.target.checked);
                    if (e.target.checked)
                      setNewSession({ ...newSession, course_id: "" });
                  }}
                  sx={{
                    color: palette.verdeClaro,
                    "&.Mui-checked": { color: palette.verde },
                  }}
                />
              }
              label={
                <Typography fontSize={14}>Sessão livre (sem curso)</Typography>
              }
            />
            {!freeSession && (
              <TextField
                select
                label="Curso"
                value={newSession.course_id}
                onChange={(e) =>
                  setNewSession({ ...newSession, course_id: e.target.value })
                }
                fullWidth
                size="small"
              >
                {courses.length === 0 ? (
                  <MenuItem
                    onClick={() => {
                      setSessionDialog(false);
                      setCourseDialog(true);
                    }}
                  >
                    <Typography fontSize={13} color={palette.verde}>
                      + Adicione um curso
                    </Typography>
                  </MenuItem>
                ) : (
                  courses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.title}
                    </MenuItem>
                  ))
                )}
              </TextField>
            )}
            <TextField
              label="Início"
              type="datetime-local"
              value={newSession.started_at}
              onChange={(e) =>
                setNewSession({ ...newSession, started_at: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
            <TextField
              label="Fim"
              type="datetime-local"
              value={newSession.ended_at}
              onChange={(e) =>
                setNewSession({ ...newSession, ended_at: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
            <TextField
              label="Anotações"
              value={newSession.notes}
              onChange={(e) =>
                setNewSession({ ...newSession, notes: e.target.value })
              }
              multiline
              rows={5}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setSessionDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSession}
            disabled={actionBusy}
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

      {/* Dialog: finalizar timer */}
      <Dialog
        open={stopDialog}
        onClose={() => setStopDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
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
              <Clock size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Finalizar sessão
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                {activeSession && (
                  <>
                    {getCourseName(activeSession.course_id)} · {elapsed}
                  </>
                )}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Anotação (opcional)"
            placeholder="O que você estudou?"
            value={stopNotes}
            onChange={(e) => setStopNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setStopDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmStopTimer}
            disabled={actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Salvar sessão"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: exportar PDF */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
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
              <Download size={20} color="#6366F1" />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Exportar estudos
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Gere um PDF com sessões e cursos
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 3 }}>
            <TextField
              label="Data início"
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: !!exportStart || undefined }}
              sx={{
                "&:focus-within .MuiInputLabel-root:not(.MuiInputLabel-shrink)":
                  {
                    transform: "translate(14px, -9px) scale(0.75)",
                    color: "primary.main",
                  },
                '& input[type="date"]::-webkit-datetime-edit': {
                  color: exportStart ? "inherit" : "transparent",
                },
                '&:focus-within input[type="date"]::-webkit-datetime-edit': {
                  color: "inherit",
                },
              }}
            />
            <TextField
              label="Data fim"
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: !!exportEnd || undefined }}
              sx={{
                "&:focus-within .MuiInputLabel-root:not(.MuiInputLabel-shrink)":
                  {
                    transform: "translate(14px, -9px) scale(0.75)",
                    color: "primary.main",
                  },
                '& input[type="date"]::-webkit-datetime-edit': {
                  color: exportEnd ? "inherit" : "transparent",
                },
                '&:focus-within input[type="date"]::-webkit-datetime-edit': {
                  color: "inherit",
                },
              }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                {
                  label: "Última semana",
                  start: dayjs().subtract(7, "day"),
                  end: dayjs(),
                },
                {
                  label: "Este mês",
                  start: dayjs().startOf("month"),
                  end: dayjs(),
                },
                {
                  label: "Mês passado",
                  start: dayjs().subtract(1, "month").startOf("month"),
                  end: dayjs().subtract(1, "month").endOf("month"),
                },
                {
                  label: "Histórico completo",
                  start: dayjs("2020-01-01"),
                  end: dayjs(),
                },
              ].map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  size="small"
                  onClick={() => {
                    setExportStart(p.start.format("YYYY-MM-DD"));
                    setExportEnd(p.end.format("YYYY-MM-DD"));
                  }}
                  sx={{
                    bgcolor: "rgba(0,0,0,0.04)",
                    fontWeight: 500,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.08)" },
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setExportDialogOpen(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!exportStart || !exportEnd || exporting}
            onClick={async () => {
              setExporting(true);
              await exportStudiesPdf(user!.id, exportStart, exportEnd);
              setExporting(false);
              setExportDialogOpen(false);
            }}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {exporting ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Gerar PDF"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
