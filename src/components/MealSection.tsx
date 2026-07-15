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
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Utensils,
  Plus,
  Trash2,
  Pencil,
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Soup,
  Sandwich,
  Share2,
  X,
  type LucideIcon,
} from "lucide-react";
import dayjs from "dayjs";
import { supabase } from "../lib/supabaseClient";
import { palette } from "../theme";
import type { MealType, MealLog, MealPlanOption } from "../types";

const MEAL_OPTIONS: Record<MealType, { label: string; icon: LucideIcon }> = {
  cafe: { label: "Café da manhã", icon: Coffee },
  lanche_manha: { label: "Lanche da manhã", icon: Apple },
  almoco: { label: "Almoço", icon: UtensilsCrossed },
  lanche_tarde: { label: "Lanche da tarde", icon: Cookie },
  jantar: { label: "Jantar", icon: Soup },
  outro: { label: "Outro", icon: Sandwich },
};

interface MealSectionProps {
  userId: string;
  meals: MealLog[];
  onDataChange: () => void;
}

export default function MealSection({
  userId,
  meals,
  onDataChange,
}: MealSectionProps) {
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // Free tab state
  const [mealType, setMealType] = useState<MealType | "">("");
  const [mealDesc, setMealDesc] = useState("");
  const [mealCal, setMealCal] = useState("");

  // Plan tab state
  const [planMealType, setPlanMealType] = useState<MealType | "">("");
  const [planOptions, setPlanOptions] = useState<MealPlanOption[]>([]);

  // Plan management state
  const [manageMealType, setManageMealType] = useState<MealType | "">("");
  const [newOptionTitle, setNewOptionTitle] = useState("");
  const [newOptionDesc, setNewOptionDesc] = useState("");
  const [newOptionCal, setNewOptionCal] = useState("");
  // Share state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [sharedWith, setSharedWith] = useState<
    { id: string; shared_with_id: string; name: string }[]
  >([]);
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  const loadPlanOptions = useCallback(async () => {
    const { data } = await supabase
      .from("meal_plan_options")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (data) setPlanOptions(data);
  }, [userId]);

  useEffect(() => {
    loadPlanOptions();
    loadSharedWith();
  }, [loadPlanOptions]);

  const loadSharedWith = async () => {
    const { data: shares } = await supabase
      .from("shared_meal_plans")
      .select("id, shared_with_id")
      .eq("owner_id", userId);
    if (shares && shares.length > 0) {
      const results = await Promise.all(
        shares.map(async (s: { id: string; shared_with_id: string }) => {
          // Tentar pegar o nome do perfil
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", s.shared_with_id)
            .maybeSingle();
          // Se não conseguiu nome, buscar email via RPC
          let displayName = profile?.name;
          if (!displayName) {
            const { data: email } = await supabase.rpc("get_email_by_user_id", {
              lookup_id: s.shared_with_id,
            });
            displayName = email || "Usuário";
          }
          return {
            id: s.id,
            shared_with_id: s.shared_with_id,
            name: displayName,
          };
        }),
      );
      setSharedWith(results);
    } else {
      setSharedWith([]);
    }
  };

  const filteredPlanOptions = planOptions.filter(
    (o) => o.meal_type === planMealType,
  );
  const managedOptions = planOptions.filter(
    (o) => o.meal_type === manageMealType,
  );

  const addMealFromPlan = async (option: MealPlanOption) => {
    await supabase.from("meal_logs").insert({
      user_id: userId,
      meal_type: option.meal_type,
      description:
        option.title + (option.description ? ` – ${option.description}` : ""),
      calories: option.calories,
      logged_at: new Date().toISOString(),
    });
    setMealModalOpen(false);
    onDataChange();
  };

  const addMealFree = async () => {
    if (!mealDesc.trim() || !mealType) return;
    setActionBusy(true);
    await supabase.from("meal_logs").insert({
      user_id: userId,
      meal_type: mealType,
      description: mealDesc.trim(),
      calories: mealCal ? Number(mealCal) : null,
      logged_at: new Date().toISOString(),
    });
    setMealDesc("");
    setMealCal("");
    setMealModalOpen(false);
    setActionBusy(false);
    onDataChange();
  };

  const removeMeal = async (id: string) => {
    await supabase.from("meal_logs").delete().eq("id", id);
    onDataChange();
  };

  const addPlanOption = async () => {
    if (!newOptionTitle.trim() || !manageMealType) return;
    setActionBusy(true);
    const maxOrder =
      managedOptions.length > 0
        ? Math.max(...managedOptions.map((o) => o.sort_order))
        : 0;
    await supabase.from("meal_plan_options").insert({
      user_id: userId,
      meal_type: manageMealType,
      title: newOptionTitle.trim(),
      description: newOptionDesc.trim() || null,
      calories: newOptionCal ? Number(newOptionCal) : null,
      sort_order: maxOrder + 1,
    });
    setNewOptionTitle("");
    setNewOptionDesc("");
    setNewOptionCal("");
    setActionBusy(false);
    loadPlanOptions();
  };

  const removePlanOption = async (id: string) => {
    await supabase.from("meal_plan_options").delete().eq("id", id);
    loadPlanOptions();
  };

  const sharePlan = async () => {
    if (!shareEmail.trim()) return;
    setShareLoading(true);
    setShareMsg(null);

    // Buscar o user pelo email via RPC (busca em auth.users)
    const { data: targetUserId, error: rpcError } = await supabase.rpc(
      "get_user_id_by_email",
      { lookup_email: shareEmail.trim().toLowerCase() },
    );

    if (rpcError || !targetUserId) {
      setShareMsg({
        type: "error",
        text: "Nenhum usuário encontrado com esse e-mail. A pessoa precisa ter conta no Broto.",
      });
      setShareLoading(false);
      return;
    }

    if (targetUserId === userId) {
      setShareMsg({
        type: "error",
        text: "Você não pode compartilhar o plano consigo mesma.",
      });
      setShareLoading(false);
      return;
    }

    const { error } = await supabase
      .from("shared_meal_plans")
      .upsert(
        { owner_id: userId, shared_with_id: targetUserId },
        { onConflict: "owner_id,shared_with_id" },
      );

    if (error) {
      setShareMsg({
        type: "error",
        text: "Erro ao compartilhar. Tente novamente.",
      });
    } else {
      setShareMsg({
        type: "success",
        text: "Plano compartilhado com sucesso!",
      });
      setShareEmail("");
      loadSharedWith();
    }
    setShareLoading(false);
  };

  return (
    <>
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
              <Utensils size={20} color={palette.laranja} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={600}>Refeições</Typography>
              <Typography fontSize={13} color="text.secondary">
                Registre o que você comeu hoje
              </Typography>
            </Box>
            {totalCalories > 0 && (
              <Chip
                label={`~${totalCalories} kcal`}
                size="small"
                sx={{ bgcolor: palette.menta, color: palette.verde }}
              />
            )}
            <IconButton
              size="small"
              onClick={() => {
                setMealType("");
                setMealDesc("");
                setMealCal("");
                setPlanMealType("");
                setTabIndex(0);
                setMealModalOpen(true);
              }}
            >
              <Plus size={20} />
            </IconButton>
          </Stack>

          {meals.length > 0 && (
            <Stack divider={<Divider />} sx={{ mt: 2 }}>
              {meals.map((m) => (
                <Stack key={m.id} gap={0.5} sx={{ py: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {(() => {
                      const { label, icon: Icon } = MEAL_OPTIONS[m.meal_type];
                      return (
                        <>
                          <Icon size={15} color={palette.laranja} />
                          <Typography fontWeight={600} fontSize={14}>
                            {label}
                          </Typography>
                        </>
                      );
                    })()}
                    {m.calories && (
                      <Chip
                        label={`${m.calories} kcal`}
                        size="small"
                        sx={{
                          bgcolor: palette.menta,
                          color: palette.verde,
                          height: 22,
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Typography fontSize={12} color="text.secondary">
                      {dayjs(m.logged_at).format("HH:mm")}
                    </Typography>
                    <IconButton size="small" onClick={() => removeMeal(m.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                  {(() => {
                    const parts = m.description?.split(" – ") || [];
                    const title = parts.length > 1 ? parts[0] : null;
                    const desc =
                      parts.length > 1 ? parts.slice(1).join(" – ") : parts[0];
                    return (
                      <Box>
                        {title && (
                          <Typography fontSize={13} fontWeight={500}>
                            {title}
                          </Typography>
                        )}
                        {desc && (
                          <Typography
                            fontSize={12}
                            color="text.secondary"
                            sx={{ whiteSpace: "pre-line" }}
                          >
                            {desc}
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Meal registration modal */}
      <Dialog
        open={mealModalOpen}
        onClose={() => setMealModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 1,
            m: { xs: 1, sm: 4 },
            maxHeight: { xs: "calc(100% - 16px)", sm: "calc(100% - 64px)" },
          },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
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
            <Box>
              <Typography fontWeight={600}>Registrar refeição</Typography>
              <Typography fontSize={13} color="text.secondary">
                Escolha do plano ou registre uma refeição livre
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{ mt: 1 }}
          >
            <Tab label="Meu plano" />
            <Tab label="Livre" />
          </Tabs>

          {tabIndex === 0 && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              {/* Resumo do plano cadastrado */}
              {(() => {
                const registeredTypes = [
                  ...new Set(planOptions.map((o) => o.meal_type)),
                ] as MealType[];
                if (registeredTypes.length > 0) {
                  return (
                    <Box
                      sx={{
                        background: `linear-gradient(135deg, ${palette.verde}08, ${palette.verdeClaro}12)`,
                        border: `1px solid ${palette.verde}20`,
                        borderRadius: 1,
                        px: 2,
                        py: 2,
                      }}
                    >
                      <Typography
                        fontSize={11}
                        color="text.secondary"
                        fontWeight={600}
                        textTransform="uppercase"
                        letterSpacing={0.5}
                        sx={{ mb: 1 }}
                      >
                        Plano cadastrado com:
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {registeredTypes.map((t, i) => {
                          const Icon = MEAL_OPTIONS[t].icon;
                          return (
                            <Chip
                              key={t}
                              icon={<Icon size={12} color={palette.verde} />}
                              label={MEAL_OPTIONS[t].label}
                              size="small"
                              sx={{
                                bgcolor: `${palette.verde}14`,
                                color: palette.verde,
                                fontWeight: 500,
                                fontSize: 11,
                                height: 26,
                                borderRadius: "13px",
                              }}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                }
                return null;
              })()}

              {/* Compartilhado com */}
              {sharedWith.length > 0 && (
                <Box>
                  <Typography
                    fontSize={11}
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ mb: 0.5 }}
                  >
                    Compartilhado com:
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {sharedWith.map((s) => (
                      <Chip
                        key={s.id}
                        label={s.name}
                        size="small"
                        onDelete={async () => {
                          await supabase
                            .from("shared_meal_plans")
                            .delete()
                            .eq("id", s.id);
                          loadSharedWith();
                        }}
                        deleteIcon={<X size={12} />}
                        sx={{ fontSize: 11, height: 24 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <Typography fontSize={12} color="text.secondary">
                Selecione a refeição para ver detalhes do plano:
              </Typography>

              <TextField
                select
                label={planMealType ? "" : "Refeição"}
                value={planMealType}
                onChange={(e) => setPlanMealType(e.target.value as MealType)}
                size="small"
                InputLabelProps={{ shrink: false }}
                fullWidth
              >
                {(
                  Object.entries(MEAL_OPTIONS) as [
                    MealType,
                    { label: string; icon: LucideIcon },
                  ][]
                ).map(([value, { label, icon: Icon }]) => (
                  <MenuItem key={value} value={value}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Icon size={16} color={palette.laranja} />
                      <span>{label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>

              {filteredPlanOptions.length === 0 && planOptions.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    py: 3.5,
                    px: 2,
                    border: "1.5px dashed rgba(45,106,79,0.18)",
                    borderRadius: 1,
                    textAlign: "center",
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
                    }}
                  >
                    <Utensils size={18} color={palette.verde} />
                  </Box>
                  <Typography
                    fontSize={13.5}
                    fontWeight={600}
                    color={palette.texto}
                  >
                    Nenhuma opção salva ainda
                  </Typography>
                  <Typography
                    fontSize={12}
                    color="text.secondary"
                    sx={{ maxWidth: 220 }}
                  >
                    As refeições que você registrar aqui vão aparecer como
                    opções rápidas na próxima vez.
                  </Typography>
                </Box>
              ) : filteredPlanOptions.length === 0 && planMealType ? (
                <Typography
                  fontSize={13}
                  color="text.secondary"
                  textAlign="center"
                  sx={{ py: 2 }}
                >
                  Nenhuma opção cadastrada para essa refeição.
                </Typography>
              ) : filteredPlanOptions.length > 0 ? (
                <Stack spacing={1}>
                  {filteredPlanOptions.map((option) => (
                    <Card
                      key={option.id}
                      variant="outlined"
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: palette.menta + "40" },
                      }}
                      onClick={() => addMealFromPlan(option)}
                    >
                      <CardContent
                        sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={600} fontSize={14}>
                              {option.title}
                            </Typography>
                            {option.description && (
                              <Typography
                                fontSize={12}
                                color="text.secondary"
                                sx={{ whiteSpace: "pre-line" }}
                              >
                                {option.description}
                              </Typography>
                            )}
                          </Box>
                          {option.calories && (
                            <Chip
                              label={`${option.calories} kcal`}
                              size="small"
                              sx={{
                                bgcolor: palette.menta,
                                color: palette.verde,
                              }}
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : null}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Share2 size={14} />}
                  onClick={() => {
                    setShareEmail("");
                    setShareMsg(null);
                    setShareModalOpen(true);
                  }}
                  sx={{
                    flex: 1,
                    color: palette.verde,
                    borderColor: palette.verde + "60",
                  }}
                >
                  Compartilhar
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Pencil size={14} />}
                  onClick={() => {
                    setManageMealType(planMealType);
                    setPlanModalOpen(true);
                  }}
                  sx={{ flex: 1 }}
                >
                  Gerenciar plano
                </Button>
              </Stack>
            </Stack>
          )}

          {tabIndex === 1 && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  label={mealType ? "" : "Refeição"}
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  size="small"
                  InputLabelProps={{ shrink: false }}
                  sx={{ flex: 2 }}
                >
                  {(
                    Object.entries(MEAL_OPTIONS) as [
                      MealType,
                      { label: string; icon: LucideIcon },
                    ][]
                  ).map(([value, { label, icon: Icon }]) => (
                    <MenuItem key={value} value={value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Icon size={16} color={palette.laranja} />
                        <span>{label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={mealCal ? "" : "Calorias"}
                  type="number"
                  value={mealCal}
                  onChange={(e) => setMealCal(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: false }}
                  sx={{ width: 100 }}
                />
              </Stack>
              <TextField
                multiline
                minRows={2}
                maxRows={5}
                label="O que você comeu?"
                value={mealDesc}
                onChange={(e) => setMealDesc(e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        {tabIndex === 0 && (
          <DialogActions>
            <Button onClick={() => setMealModalOpen(false)}>Cancelar</Button>
          </DialogActions>
        )}
        {tabIndex === 1 && (
          <DialogActions>
            <Button onClick={() => setMealModalOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={addMealFree}
              disabled={!mealDesc.trim() || !mealType || actionBusy}
            >
              {actionBusy ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Plan management modal */}
      <Dialog
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
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
              <Pencil size={20} color={palette.verde} />
            </Box>
            <Box>
              <Typography fontWeight={600}>Gerenciar plano</Typography>
              <Typography fontSize={13} color="text.secondary">
                Adicione ou remova opções do seu plano alimentar
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 4 }}>
            <TextField
              select
              label={manageMealType ? "" : "Refeição"}
              value={manageMealType}
              onChange={(e) => setManageMealType(e.target.value as MealType)}
              size="small"
              InputLabelProps={{ shrink: false }}
              fullWidth
            >
              {(
                Object.entries(MEAL_OPTIONS) as [
                  MealType,
                  { label: string; icon: LucideIcon },
                ][]
              ).map(([value, { label, icon: Icon }]) => (
                <MenuItem key={value} value={value}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon size={16} color={palette.laranja} />
                    <span>{label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1}>
              <TextField
                label="Título"
                value={newOptionTitle}
                onChange={(e) => setNewOptionTitle(e.target.value)}
                size="small"
                sx={{ flex: 2 }}
              />
              <TextField
                label={newOptionCal ? "" : "Calorias"}
                type="number"
                value={newOptionCal}
                onChange={(e) => setNewOptionCal(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: false }}
                sx={{ width: 110 }}
              />
            </Stack>
            <TextField
              label="Descrição"
              value={newOptionDesc}
              onChange={(e) => setNewOptionDesc(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={5}
            />
            <Button
              variant="contained"
              onClick={addPlanOption}
              disabled={!newOptionTitle.trim() || actionBusy}
              startIcon={<Plus size={16} />}
            >
              {actionBusy ? "Salvando..." : "Adicionar opção"}
            </Button>

            {managedOptions.length > 0 && (
              <>
                <Divider />
                <Stack spacing={1}>
                  {managedOptions.map((option) => (
                    <Stack
                      key={option.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ py: 0.5 }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={600} fontSize={14}>
                          {option.title}
                        </Typography>
                        {option.description && (
                          <Typography
                            component="span"
                            fontSize={12}
                            color="text.secondary"
                            sx={{ whiteSpace: "pre-line", display: "block" }}
                          >
                            {option.description
                              .split(
                                /(\d+\s*(?:ml|l|g|kg|mg|kcal|cal|un|oz|lb|xícaras?|colheres?|fatias?|pedaços?|porç(?:ão|ões)|ovos?))/gi,
                              )
                              .map((part, i) =>
                                /\d+\s*(?:ml|l|g|kg|mg|kcal|cal|un|oz|lb|xícaras?|colheres?|fatias?|pedaços?|porç(?:ão|ões)|ovos?)/i.test(
                                  part,
                                ) ? (
                                  <Box
                                    key={i}
                                    component="span"
                                    sx={{
                                      bgcolor: "#FFF3E0",
                                      color: "#E65100",
                                      fontWeight: 600,
                                      borderRadius: "4px",
                                      px: 0.5,
                                      py: 0.1,
                                      fontSize: 11,
                                    }}
                                  >
                                    {part}
                                  </Box>
                                ) : (
                                  part
                                ),
                              )}
                          </Typography>
                        )}
                      </Box>
                      {option.calories && (
                        <Chip
                          label={`${option.calories} kcal`}
                          size="small"
                          sx={{ bgcolor: palette.menta, color: palette.verde }}
                        />
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removePlanOption(option.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Share modal */}
      <Dialog
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <Box
              sx={{
                width: 44,
                minWidth: 44,
                height: 44,
                borderRadius: "22%",
                bgcolor: palette.laranja + "12",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Share2 size={20} color={palette.laranja} />
            </Box>
            <Box>
              <Typography fontWeight={600}>Compartilhar plano</Typography>
              <Typography fontSize={13} color="text.secondary">
                Quem receber o compartilhamento poderá visualizar suas opções de
                refeição no próprio dashboard
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="E-mail"
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              size="small"
              fullWidth
              placeholder="email@exemplo.com"
            />
            {shareMsg && (
              <Typography
                fontSize={13}
                color={shareMsg.type === "success" ? palette.verde : "error"}
              >
                {shareMsg.text}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareModalOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={sharePlan}
            disabled={!shareEmail.trim() || shareLoading}
          >
            {shareLoading ? "Enviando..." : "Compartilhar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
