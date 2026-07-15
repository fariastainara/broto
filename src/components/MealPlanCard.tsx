import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  MenuItem,
  TextField,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Utensils,
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Soup,
  Sandwich,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { palette } from "../theme";
import type { MealType, MealPlanOption } from "../types";

const MEAL_OPTIONS: Record<MealType, { label: string; icon: LucideIcon }> = {
  cafe: { label: "Café da manhã", icon: Coffee },
  lanche_manha: { label: "Lanche da manhã", icon: Apple },
  almoco: { label: "Almoço", icon: UtensilsCrossed },
  lanche_tarde: { label: "Lanche da tarde", icon: Cookie },
  jantar: { label: "Jantar", icon: Soup },
  outro: { label: "Outro", icon: Sandwich },
};

interface MealPlanCardProps {
  userId: string;
}

interface PlanTab {
  label: string;
  options: MealPlanOption[];
}

export default function MealPlanCard({ userId }: MealPlanCardProps) {
  const [tabs, setTabs] = useState<PlanTab[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<MealType | "">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Carregar meu plano
    const { data: myOptions } = await supabase
      .from("meal_plan_options")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    // Carregar planos compartilhados comigo
    const { data: shares } = await supabase
      .from("shared_meal_plans")
      .select("owner_id")
      .eq("shared_with_id", userId);

    const allTabs: PlanTab[] = [];

    if (myOptions && myOptions.length > 0) {
      allTabs.push({ label: "Meu plano", options: myOptions });
    }

    if (shares && shares.length > 0) {
      for (const s of shares) {
        // Buscar nome do dono
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", s.owner_id)
          .maybeSingle();
        let name = profile?.name?.split(" ")[0];
        if (!name) {
          const { data: email } = await supabase.rpc("get_email_by_user_id", {
            lookup_id: s.owner_id,
          });
          name = email?.split("@")[0] || "Alguém";
        }

        // Buscar opções do plano
        const { data: options } = await supabase
          .from("meal_plan_options")
          .select("*")
          .eq("user_id", s.owner_id)
          .order("sort_order", { ascending: true });

        if (options && options.length > 0) {
          allTabs.push({
            label: `Plano de ${name.charAt(0).toUpperCase() + name.slice(1)}`,
            options,
          });
        }
      }
    }

    setTabs(allTabs);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset seleção ao trocar de tab
  useEffect(() => {
    setSelectedMeal("");
  }, [activeTab]);

  if (loading) return null;
  if (tabs.length === 0) return null;

  const currentTab = tabs[activeTab] ?? tabs[0];
  const availableMealTypes = [
    ...new Set(currentTab.options.map((o) => o.meal_type)),
  ] as MealType[];
  const filtered = currentTab.options.filter(
    (o) => o.meal_type === selectedMeal,
  );

  return (
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
            <Typography fontWeight={600}>Plano alimentar</Typography>
            <Typography fontSize={13} color="text.secondary">
              Escolha a refeição para ver o plano
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          {/* Tabs */}
          {tabs.length > 1 && (
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ mb: 2, minHeight: 32 }}
              TabIndicatorProps={{ sx: { height: 2 } }}
            >
              {tabs.map((t, i) => (
                <Tab
                  key={i}
                  label={t.label}
                  sx={{ fontSize: 12, minHeight: 32, py: 0.5, px: 1.5 }}
                />
              ))}
            </Tabs>
          )}

          {/* Resumo do plano */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${palette.verde}08, ${palette.verdeClaro}12)`,
              border: `1px solid ${palette.verde}20`,
              borderRadius: 1,
              px: 2,
              py: 1.5,
              mb: 1.5,
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
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              {availableMealTypes.map((t) => {
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

          <Typography fontSize={12} color="text.secondary" sx={{ mb: 1 }}>
            Selecione a refeição para ver detalhes do plano:
          </Typography>

          {/* Seletor de refeição */}
          <TextField
            select
            fullWidth
            size="small"
            label={selectedMeal ? "" : "Refeição"}
            value={selectedMeal}
            onChange={(e) => setSelectedMeal(e.target.value as MealType)}
            InputLabelProps={{ shrink: false }}
            sx={{ mb: 1.5 }}
          >
            {availableMealTypes.map((type) => {
              const config = MEAL_OPTIONS[type];
              const Icon = config.icon;
              return (
                <MenuItem key={type} value={type}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon size={16} color={palette.laranja} />
                    <Typography fontSize={14}>{config.label}</Typography>
                  </Stack>
                </MenuItem>
              );
            })}
          </TextField>

          {/* Opções do plano */}
          {filtered.length > 0 && (
            <Stack spacing={1}>
              {filtered.map((option) => (
                <Box
                  key={option.id}
                  sx={{
                    bgcolor: "rgba(0,0,0,0.02)",
                    borderRadius: 1,
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontSize={14} fontWeight={600}>
                        {option.title}
                      </Typography>
                      {option.description && (
                        <Typography
                          component="span"
                          fontSize={12.5}
                          color="text.secondary"
                          sx={{
                            mt: 0.3,
                            lineHeight: 1.5,
                            whiteSpace: "pre-line",
                            display: "block",
                          }}
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
                        sx={{
                          bgcolor: palette.menta,
                          color: palette.verde,
                          fontWeight: 600,
                          fontSize: 12,
                          ml: 1,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
          <Box sx={{ pb: 1 }} />
        </Box>
      </CardContent>
    </Card>
  );
}
