import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  IconButton,
  Checkbox,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Collapse,
  Chip,
} from "@mui/material";
import {
  Plus,
  Trash2,
  ListChecks,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import PageHeader from "../components/PageHeader";
import BrotoLoader from "../components/BrotoLoader";
import { exportTasksPdf } from "../lib/exportTasksPdf";
import type { Task, TaskCategory } from "../types";

dayjs.locale("pt-br");

const LIST_COLORS: Record<string, string> = {
  casa: palette.verdeClaro,
  trabalho: palette.laranja,
  faculdade: "#6366F1",
  financeiro: "#D9A441",
  saude: palette.verde,
  outro: palette.cinza,
};

export default function Tasks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [listDialog, setListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [emptyLists, setEmptyLists] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteListConfirm, setDeleteListConfirm] = useState<string | null>(
    null,
  );
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [showCompletedLists, setShowCompletedLists] = useState(false);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStart, setExportStart] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [exportEnd, setExportEnd] = useState(dayjs().format("YYYY-MM-DD"));
  const [exporting, setExporting] = useState(false);

  async function loadTasks() {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setTasks((data ?? []) as Task[]);
  }

  useEffect(() => {
    loadTasks().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Agrupa por categoria (cada categoria é um checklist)
  const lists = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.category || "outro";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Inclui listas vazias que foram criadas mas ainda não têm itens
    for (const name of emptyLists) {
      if (!map.has(name)) map.set(name, []);
    }
    return Array.from(map.entries());
  }, [tasks, emptyLists]);

  // Listas com pendências vs totalmente concluídas
  const activeLists = useMemo(
    () =>
      lists.filter(
        ([, items]) =>
          items.length === 0 || items.some((t) => t.status !== "concluida"),
      ),
    [lists],
  );
  const completedLists = useMemo(
    () =>
      lists.filter(
        ([, items]) =>
          items.length > 0 && items.every((t) => t.status === "concluida"),
      ),
    [lists],
  );

  const totalDone = tasks.filter((t) => t.status === "concluida").length;
  const totalPending = tasks.filter((t) => t.status !== "concluida").length;

  async function createList() {
    if (!user || !newListName.trim()) return;
    const listKey = newListName.trim().toLowerCase().replace(/\s+/g, "_");
    setEmptyLists((prev) => [...prev, listKey]);
    setNewListName("");
    setListDialog(false);
    setAddingToList(listKey);
    setNewItemTitle("");
  }

  async function addItem(listName: string) {
    if (!user || !newItemTitle.trim()) return;
    setActionBusy(true);
    await supabase.from("tasks").insert({
      user_id: user.id,
      title: newItemTitle.trim(),
      category: listName as TaskCategory,
      priority: "media",
      status: "pendente",
    });
    setNewItemTitle("");
    setActionBusy(false);
    loadTasks();
  }

  async function toggleItem(task: Task) {
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);
    loadTasks();
  }

  async function removeItem(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  }

  async function saveEditTask(id: string) {
    if (!editingTitle.trim()) return;
    const newTitle = editingTitle.trim();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t)),
    );
    setEditingTask(null);
    setEditingTitle("");
    await supabase.from("tasks").update({ title: newTitle }).eq("id", id);
    loadTasks();
  }

  async function deleteList(listName: string) {
    const listTasks = tasks.filter((t) => (t.category || "outro") === listName);
    for (const t of listTasks) {
      await supabase.from("tasks").delete().eq("id", t.id);
    }
    setEmptyLists((prev) => prev.filter((n) => n !== listName));
    setDeleteListConfirm(null);
    loadTasks();
  }

  async function renameList(oldName: string) {
    const newName = editingListName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!newName || newName === oldName) {
      setEditingList(null);
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        (t.category || "outro") === oldName
          ? { ...t, category: newName as any }
          : t,
      ),
    );
    setEmptyLists((prev) => prev.map((n) => (n === oldName ? newName : n)));
    setEditingList(null);
    setEditingListName("");
    const listTasks = tasks.filter((t) => (t.category || "outro") === oldName);
    for (const t of listTasks) {
      await supabase.from("tasks").update({ category: newName }).eq("id", t.id);
    }
    loadTasks();
  }

  if (loading) {
    return <BrotoLoader label="Carregando suas tarefas" fullScreen={false} />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <PageHeader
          eyebrow="Tarefas"
          title="Checklists"
          subtitle={`${lists.length} lista${lists.length !== 1 ? "s" : ""} · ${totalPending} pendente${totalPending !== 1 ? "s" : ""} · ${totalDone} feita${totalDone !== 1 ? "s" : ""}`}
        />
        <IconButton
          onClick={() => setExportDialogOpen(true)}
          title="Exportar PDF"
        >
          <Download size={20} color={palette.verde} />
        </IconButton>
      </Stack>

      <Stack spacing={2.5}>
        {lists.length === 0 ? (
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
                  <ListChecks size={20} color={palette.verde} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600}>Suas listas</Typography>
                  <Typography fontSize={13} color="text.secondary">
                    Organize suas tarefas em checklists
                  </Typography>
                </Box>
              </Stack>

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
                  <CheckSquare size={20} color={palette.verde} />
                </Box>
                <Typography
                  fontSize={13.5}
                  fontWeight={600}
                  color={palette.texto}
                >
                  Nenhuma lista criada
                </Typography>
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{ maxWidth: 220, mb: 0.5 }}
                >
                  Crie listas como "Compras", "Casa" ou "Trabalho" e vá
                  adicionando itens pra riscar.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={15} />}
                  onClick={() => setListDialog(true)}
                  sx={{
                    borderColor: palette.verdeClaro,
                    color: palette.verde,
                    mt: 0.5,
                  }}
                >
                  Nova lista
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeLists.map(([listName, listTasks]) => {
              const done = listTasks.filter(
                (t) => t.status === "concluida",
              ).length;
              const total = listTasks.length;
              const color = LIST_COLORS[listName] || palette.verde;

              return (
                <Card key={listName}>
                  <CardContent>
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          bgcolor: color + "18",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ListChecks size={20} color={color} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        {editingList === listName ? (
                          <TextField
                            variant="standard"
                            size="small"
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameList(listName);
                              if (e.key === "Escape") setEditingList(null);
                            }}
                            onBlur={() => renameList(listName)}
                            autoFocus
                            InputProps={{ disableUnderline: true }}
                            inputProps={{
                              style: {
                                fontSize: 16,
                                fontWeight: 600,
                                textTransform: "capitalize",
                              },
                            }}
                          />
                        ) : (
                          <Typography
                            fontWeight={600}
                            onClick={() => {
                              setEditingList(listName);
                              setEditingListName(listName.replace(/_/g, " "));
                            }}
                            sx={{
                              textTransform: "capitalize",
                              cursor: "pointer",
                            }}
                          >
                            {listName.replace(/_/g, " ")}
                          </Typography>
                        )}
                        <Typography fontSize={13} color="text.secondary">
                          {done}/{total} concluído{total !== 1 ? "s" : ""}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setAddingToList(listName);
                          setNewItemTitle("");
                        }}
                      >
                        <Plus size={20} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteListConfirm(listName)}
                      >
                        <Trash2 size={16} color={palette.cinza} />
                      </IconButton>
                    </Stack>

                    <Stack divider={<Divider />} sx={{ mt: 2 }}>
                      {listTasks.map((task) => {
                        const isDone = task.status === "concluida";
                        return (
                          <Stack
                            key={task.id}
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            sx={{ py: 0.8 }}
                          >
                            <Checkbox
                              size="small"
                              checked={isDone}
                              onChange={() => toggleItem(task)}
                              sx={{
                                p: 0.3,
                                color: palette.verdeClaro,
                                "&.Mui-checked": { color: palette.verde },
                              }}
                            />
                            {editingTask === task.id ? (
                              <TextField
                                variant="standard"
                                size="small"
                                value={editingTitle}
                                onChange={(e) =>
                                  setEditingTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditTask(task.id);
                                  if (e.key === "Escape") setEditingTask(null);
                                }}
                                onBlur={() => saveEditTask(task.id)}
                                autoFocus
                                sx={{ flex: 1 }}
                                InputProps={{ disableUnderline: true }}
                                inputProps={{ style: { fontSize: 14 } }}
                              />
                            ) : (
                              <Typography
                                fontSize={14}
                                onClick={() => {
                                  if (!isDone) {
                                    setEditingTask(task.id);
                                    setEditingTitle(task.title);
                                  }
                                }}
                                sx={{
                                  flex: 1,
                                  textDecoration: isDone
                                    ? "line-through"
                                    : "none",
                                  color: isDone
                                    ? "text.secondary"
                                    : "text.primary",
                                  cursor: isDone ? "default" : "pointer",
                                }}
                              >
                                {task.title}
                              </Typography>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => removeItem(task.id)}
                            >
                              <Trash2 size={14} color={palette.cinza} />
                            </IconButton>
                          </Stack>
                        );
                      })}

                      {addingToList === listName ? (
                        <Stack direction="row" spacing={1} sx={{ py: 1 }}>
                          <TextField
                            size="small"
                            placeholder="Novo item"
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addItem(listName);
                            }}
                            sx={{ flex: 1 }}
                            autoFocus
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => addItem(listName)}
                            disabled={!newItemTitle.trim() || actionBusy}
                            sx={{ borderRadius: 2 }}
                          >
                            {actionBusy ? (
                              <CircularProgress
                                size={16}
                                sx={{ color: "white" }}
                              />
                            ) : (
                              "OK"
                            )}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => setAddingToList(null)}
                            sx={{ color: palette.cinza }}
                          >
                            ✕
                          </Button>
                        </Stack>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}

            {/* Listas concluídas — colapsável */}
            {completedLists.length > 0 && (
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => setShowCompletedLists(!showCompletedLists)}
                  sx={{ cursor: "pointer", py: 1.5, pl: 0.5 }}
                >
                  {showCompletedLists ? (
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
                    {completedLists.length} lista
                    {completedLists.length !== 1 ? "s" : ""} concluída
                    {completedLists.length !== 1 ? "s" : ""}
                  </Typography>
                </Stack>
                <Collapse in={showCompletedLists}>
                  <Stack spacing={1.5}>
                    {completedLists.map(([listName, listTasks]) => {
                      const color = LIST_COLORS[listName] || palette.verde;
                      return (
                        <Card key={listName} sx={{ opacity: 0.6 }}>
                          <CardContent sx={{ py: "12px !important" }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={2}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "10px",
                                  bgcolor: color + "18",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <CheckSquare size={16} color={color} />
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  fontWeight={600}
                                  fontSize={14}
                                  sx={{
                                    textTransform: "capitalize",
                                    textDecoration: "line-through",
                                  }}
                                >
                                  {listName.replace(/_/g, " ")}
                                </Typography>
                                <Typography
                                  fontSize={12}
                                  color="text.secondary"
                                >
                                  {listTasks.length} item
                                  {listTasks.length !== 1 ? "s" : ""} concluído
                                  {listTasks.length !== 1 ? "s" : ""}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={() => setDeleteListConfirm(listName)}
                              >
                                <Trash2 size={14} color={palette.cinza} />
                              </IconButton>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Collapse>
              </Box>
            )}

            {/* Botão pra criar nova lista */}
            <Button
              startIcon={<Plus size={16} />}
              onClick={() => setListDialog(true)}
              sx={{
                color: palette.verde,
                fontWeight: 600,
                alignSelf: "flex-start",
              }}
            >
              Nova lista
            </Button>
          </>
        )}
      </Stack>

      {/* Dialog: nova lista */}
      <Dialog
        open={listDialog}
        onClose={() => setListDialog(false)}
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
              <ListChecks size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Nova lista
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Crie um checklist pra organizar tarefas
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Nome da lista"
            placeholder="Ex: Compras, Casa, Trabalho..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createList();
            }}
            fullWidth
            size="small"
            autoFocus
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setListDialog(false)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={createList}
            disabled={!newListName.trim()}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Criar lista
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: confirmar exclusão de lista */}
      <Dialog
        open={!!deleteListConfirm}
        onClose={() => setDeleteListConfirm(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle>
          <Typography fontWeight={600} fontSize={18}>
            Excluir lista
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            Tem certeza que deseja excluir a lista{" "}
            <strong>{deleteListConfirm?.replace(/_/g, " ")}</strong> e todas as
            suas tarefas?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteListConfirm(null)}
            sx={{ color: palette.cinza }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteListConfirm && deleteList(deleteListConfirm)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Excluir
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
                bgcolor: palette.verde + "18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Download size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600} fontSize={18}>
                Exportar tarefas
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                Gere um PDF com suas listas
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
              await exportTasksPdf(user!.id, exportStart, exportEnd);
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
