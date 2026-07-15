import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  Target,
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Pencil,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import PageHeader from "../components/PageHeader";
import BrotoLoader from "../components/BrotoLoader";
import type { Goal, Challenge, ChallengeCheckin } from "../types";

dayjs.locale("pt-br");

export default function GoalsChallenges() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [checkins, setCheckins] = useState<ChallengeCheckin[]>([]);

  const [goalDialog, setGoalDialog] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalDateFocused, setGoalDateFocused] = useState(false);

  const [challengeDialog, setChallengeDialog] = useState(false);
  const [chTitle, setChTitle] = useState("");
  const [chDays, setChDays] = useState("21");
  const [actionBusy, setActionBusy] = useState(false);

  const [editGoalDialog, setEditGoalDialog] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [editGoalDate, setEditGoalDate] = useState("");

  const [editChallengeId, setEditChallengeId] = useState<string | null>(null);
  const [editChallengeTitle, setEditChallengeTitle] = useState("");

  async function loadAll() {
    if (!user) return;
    const [g, c, k] = await Promise.all([
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("challenge_checkins").select("*").eq("user_id", user.id),
    ]);
    setGoals(g.data ?? []);
    setChallenges(c.data ?? []);
    setCheckins(k.data ?? []);
  }

  useEffect(() => {
    loadAll().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function addGoal() {
    if (!user || !goalTitle.trim()) return;
    setActionBusy(true);
    await supabase.from("goals").insert({
      user_id: user.id,
      title: goalTitle.trim(),
      target_date: goalDate || null,
      status: "ativa",
    });
    setGoalTitle("");
    setGoalDate("");
    setGoalDialog(false);
    setActionBusy(false);
    loadAll();
  }

  async function toggleGoal(goal: Goal) {
    await supabase
      .from("goals")
      .update({ status: goal.status === "concluida" ? "ativa" : "concluida" })
      .eq("id", goal.id);
    loadAll();
  }

  async function removeGoal(id: string) {
    await supabase.from("goals").delete().eq("id", id);
    loadAll();
  }

  async function addChallenge() {
    if (!user || !chTitle.trim()) return;
    setActionBusy(true);
    const start = dayjs().format("YYYY-MM-DD");
    const end = dayjs().add(Number(chDays), "day").format("YYYY-MM-DD");
    await supabase.from("challenges").insert({
      user_id: user.id,
      title: chTitle.trim(),
      start_date: start,
      end_date: end,
      target_count: Number(chDays),
    });
    setChTitle("");
    setChDays("21");
    setChallengeDialog(false);
    setActionBusy(false);
    loadAll();
  }

  async function checkinToday(challenge: Challenge) {
    if (!user) return;
    const today = dayjs().format("YYYY-MM-DD");
    const already = checkins.find(
      (k) => k.challenge_id === challenge.id && k.checkin_date === today,
    );
    if (already) {
      await supabase.from("challenge_checkins").delete().eq("id", already.id);
    } else {
      await supabase.from("challenge_checkins").insert({
        challenge_id: challenge.id,
        user_id: user.id,
        checkin_date: today,
      });
    }
    loadAll();
  }

  async function removeChallenge(id: string) {
    await supabase.from("challenges").delete().eq("id", id);
    loadAll();
  }

  async function saveEditGoal() {
    if (!editGoalId || !editGoalTitle.trim()) return;
    setActionBusy(true);
    await supabase
      .from("goals")
      .update({
        title: editGoalTitle.trim(),
        target_date: editGoalDate || null,
      })
      .eq("id", editGoalId);
    setEditGoalDialog(false);
    setEditGoalId(null);
    setActionBusy(false);
    loadAll();
  }

  async function saveEditChallenge(id: string) {
    if (!editChallengeTitle.trim()) return;
    await supabase
      .from("challenges")
      .update({ title: editChallengeTitle.trim() })
      .eq("id", id);
    setEditChallengeId(null);
    setEditChallengeTitle("");
    loadAll();
  }

  const todayStr = dayjs().format("YYYY-MM-DD");
  const activeGoals = goals.filter((g) => g.status === "ativa").length;
  const completedGoals = goals.filter((g) => g.status === "concluida").length;
  const activeChallenges = challenges.length;

  if (loading) {
    return (
      <BrotoLoader label="Carregando metas e desafios" fullScreen={false} />
    );
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Metas & Desafios"
        title="Objetivos"
        subtitle={`${activeGoals} meta${activeGoals !== 1 ? "s" : ""} ativa${activeGoals !== 1 ? "s" : ""} · ${activeChallenges} desafio${activeChallenges !== 1 ? "s" : ""}`}
      />

      {/* Resumo rápido */}
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 3 }}
      >
        <Chip
          icon={<Target size={14} color={palette.verde} />}
          label={`${activeGoals} meta${activeGoals !== 1 ? "s" : ""}`}
          sx={{ bgcolor: palette.menta, color: palette.verde, fontWeight: 600 }}
        />
        {completedGoals > 0 && (
          <Chip
            icon={<CheckCircle2 size={14} color={palette.verdeClaro} />}
            label={`${completedGoals} alcançada${completedGoals !== 1 ? "s" : ""}`}
            sx={{
              bgcolor: palette.menta,
              color: palette.verdeClaro,
              fontWeight: 600,
            }}
          />
        )}
        {activeChallenges > 0 && (
          <Chip
            icon={<Flame size={14} color={palette.laranja} />}
            label={`${activeChallenges} desafio${activeChallenges !== 1 ? "s" : ""}`}
            sx={{
              bgcolor: "rgba(224,122,58,0.1)",
              color: palette.laranja,
              fontWeight: 600,
            }}
          />
        )}
      </Stack>

      <Stack spacing={2.5}>
        {/* METAS */}
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
                <Target size={20} color={palette.verde} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Metas</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Objetivos de longo prazo que você quer alcançar
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setGoalDialog(true)}>
                <Plus size={20} />
              </IconButton>
            </Stack>

            {goals.length === 0 ? (
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
                  ml: 7,
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
                  <Target size={20} color={palette.verde} />
                </Box>
                <Typography
                  fontSize={13.5}
                  fontWeight={600}
                  color={palette.texto}
                >
                  Nenhuma meta cadastrada
                </Typography>
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{ maxWidth: 220, mb: 0.5 }}
                >
                  Metas são objetivos maiores como "emagrecer 5kg" ou "ler 12
                  livros no ano".
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={15} />}
                  onClick={() => setGoalDialog(true)}
                  sx={{
                    borderColor: palette.verdeClaro,
                    color: palette.verde,
                    mt: 0.5,
                  }}
                >
                  Nova meta
                </Button>
              </Box>
            ) : (
              <Stack divider={<Divider />} sx={{ mt: 2, pl: 7 }}>
                {goals.map((g) => {
                  const done = g.status === "concluida";
                  return (
                    <Stack
                      key={g.id}
                      direction="row"
                      alignItems="flex-start"
                      spacing={1}
                      sx={{ py: 1 }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => toggleGoal(g)}
                        sx={{ mt: 0.2 }}
                      >
                        {done ? (
                          <CheckCircle2 size={20} color={palette.verde} />
                        ) : (
                          <Circle size={20} color={palette.cinza} />
                        )}
                      </IconButton>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          fontWeight={600}
                          fontSize={14}
                          sx={{
                            textDecoration: done ? "line-through" : "none",
                            color: done ? "text.secondary" : "text.primary",
                          }}
                        >
                          {g.title}
                        </Typography>
                        {g.target_date && (
                          <Typography fontSize={12} color="text.secondary">
                            Prazo: {dayjs(g.target_date).format("DD/MM/YYYY")}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditGoalId(g.id);
                          setEditGoalTitle(g.title);
                          setEditGoalDate(g.target_date || "");
                          setEditGoalDialog(true);
                        }}
                      >
                        <Pencil size={14} color={palette.cinza} />
                      </IconButton>
                      <IconButton size="small" onClick={() => removeGoal(g.id)}>
                        <Trash2 size={15} color={palette.cinza} />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* DESAFIOS */}
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
                <Flame size={20} color={palette.laranja} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>Desafios</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Compromissos com prazo e check-in diário
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setChallengeDialog(true)}>
                <Plus size={20} />
              </IconButton>
            </Stack>

            {challenges.length === 0 ? (
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
                  ml: 7,
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
                  <Flame size={20} color={palette.laranja} />
                </Box>
                <Typography
                  fontSize={13.5}
                  fontWeight={600}
                  color={palette.texto}
                >
                  Nenhum desafio ativo
                </Typography>
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{ maxWidth: 220, mb: 0.5 }}
                >
                  Desafios têm check-in diário como "21 dias sem açúcar" ou "30
                  dias meditando".
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={15} />}
                  onClick={() => setChallengeDialog(true)}
                  sx={{
                    borderColor: palette.verdeClaro,
                    color: palette.verde,
                    mt: 0.5,
                  }}
                >
                  Novo desafio
                </Button>
              </Box>
            ) : (
              <Stack divider={<Divider />} sx={{ mt: 2, pl: 7 }}>
                {challenges.map((c) => {
                  const doneToday = !!checkins.find(
                    (k) =>
                      k.challenge_id === c.id && k.checkin_date === todayStr,
                  );
                  const totalDone = checkins.filter(
                    (k) => k.challenge_id === c.id,
                  ).length;
                  const pct = Math.min(
                    100,
                    Math.round((totalDone / c.target_count) * 100),
                  );
                  return (
                    <Stack key={c.id} gap={1} sx={{ py: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          {editChallengeId === c.id ? (
                            <TextField
                              size="small"
                              value={editChallengeTitle}
                              onChange={(e) => setEditChallengeTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditChallenge(c.id);
                                if (e.key === "Escape") setEditChallengeId(null);
                              }}
                              onBlur={() => saveEditChallenge(c.id)}
                              autoFocus
                              fullWidth
                              inputProps={{ style: { fontSize: 14, fontWeight: 600 } }}
                            />
                          ) : (
                            <>
                              <Typography
                                fontWeight={600}
                                fontSize={14}
                                onClick={() => {
                                  setEditChallengeId(c.id);
                                  setEditChallengeTitle(c.title);
                                }}
                                sx={{ cursor: "pointer" }}
                              >
                                {c.title}
                              </Typography>
                              <Typography fontSize={12} color="text.secondary">
                                {totalDone}/{c.target_count} dias · até{" "}
                                {dayjs(c.end_date).format("DD/MM")}
                              </Typography>
                            </>
                          )}
                        </Box>
                        <Chip
                          label={doneToday ? "Feito hoje ✓" : "Marcar hoje"}
                          size="small"
                          onClick={() => checkinToday(c)}
                          sx={{
                            bgcolor: doneToday
                              ? palette.verdeClaro
                              : palette.menta,
                            color: doneToday ? "#fff" : palette.verde,
                            fontWeight: 600,
                            fontSize: 11,
                            height: 24,
                            cursor: "pointer",
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeChallenge(c.id)}
                        >
                          <Trash2 size={15} color={palette.cinza} />
                        </IconButton>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: palette.menta,
                          "& .MuiLinearProgress-bar": {
                            bgcolor:
                              pct === 100 ? palette.verde : palette.laranja,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Dialog: nova meta */}
      <Dialog
        open={goalDialog}
        onClose={() => setGoalDialog(false)}
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
              <Target size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Nova meta
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Defina um objetivo para alcançar
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack gap={3} sx={{ mt: 3 }}>
            <TextField
              label="O que você quer alcançar?"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={4}
            />
            <TextField
              label="Prazo (opcional)"
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              onFocus={() => setGoalDateFocused(true)}
              onBlur={() => setGoalDateFocused(false)}
              InputLabelProps={{ shrink: goalDateFocused || !!goalDate }}
              fullWidth
              size="small"
              sx={{
                '& input[type="date"]::-webkit-datetime-edit': {
                  color:
                    goalDateFocused || goalDate ? "inherit" : "transparent",
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setGoalDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={addGoal}
            disabled={!goalTitle.trim() || actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Criar meta"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: novo desafio */}
      <Dialog
        open={challengeDialog}
        onClose={() => setChallengeDialog(false)}
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
              <Flame size={20} color={palette.laranja} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Novo desafio
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Crie um compromisso com check-in diário
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 3 }}>
            <TextField
              label="Nome do desafio"
              placeholder="Ex: Caminhar após o almoço"
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Duração (dias)"
              type="number"
              value={chDays}
              onChange={(e) => setChDays(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setChallengeDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={addChallenge}
            disabled={!chTitle.trim() || actionBusy}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {actionBusy ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Criar desafio"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: editar meta */}
      <Dialog
        open={editGoalDialog}
        onClose={() => setEditGoalDialog(false)}
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
              <Pencil size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Editar meta
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack gap={3} sx={{ mt: 3 }}>
            <TextField
              label="O que você quer alcançar?"
              value={editGoalTitle}
              onChange={(e) => setEditGoalTitle(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={4}
            />
            <TextField
              label="Prazo (opcional)"
              type="date"
              value={editGoalDate}
              onChange={(e) => setEditGoalDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditGoalDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveEditGoal}
            disabled={!editGoalTitle.trim() || actionBusy}
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
