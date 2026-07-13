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

interface SharedMealPlanViewProps {
  ownerId: string;
  ownerName: string;
}

export default function SharedMealPlanView({
  ownerId,
  ownerName,
}: SharedMealPlanViewProps) {
  const [planOptions, setPlanOptions] = useState<MealPlanOption[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealType | "">("");

  const loadPlan = useCallback(async () => {
    const { data } = await supabase
      .from("meal_plan_options")
      .select("*")
      .eq("user_id", ownerId)
      .order("sort_order", { ascending: true });
    if (data) setPlanOptions(data);
  }, [ownerId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Tipos de refeição que o dono tem no plano
  const availableMealTypes = [
    ...new Set(planOptions.map((o) => o.meal_type)),
  ] as MealType[];

  const filtered = planOptions.filter((o) => o.meal_type === selectedMeal);

  // Não selecionar automaticamente - deixar o usuário escolher

  if (planOptions.length === 0) return null;

  const firstName = ownerName?.split(" ")[0] || "Alguém";

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
            <Typography fontWeight={600}>
              Plano alimentar de {firstName}
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              Escolha a refeição para ver o plano
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ pl: 7, mt: 1.5 }}>
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
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                        🍽️ {option.title}
                      </Typography>
                      {option.description && (
                        <Typography
                          fontSize={12.5}
                          color="text.secondary"
                          sx={{ mt: 0.3, lineHeight: 1.5 }}
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
        </Box>
      </CardContent>
    </Card>
  );
}
