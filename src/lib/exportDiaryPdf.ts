import jsPDF from "jspdf";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "./supabaseClient";
import { renderLogoImage } from "./pdfLogo";
import type {
  MealLog,
  WaterLog,
  Exercise,
  SleepLog,
  WeightLog,
  MoodLog,
  Habit,
  HabitLog,
  MoodType,
  ExerciseType,
} from "../types";

dayjs.locale("pt-br");

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  musculacao: "Musculação",
  caminhada: "Caminhada",
  corrida: "Corrida",
  bicicleta: "Bicicleta",
  funcional: "Funcional",
  outro: "Outro",
};
const MOOD_LABELS: Record<MoodType, string> = {
  excelente: "Feliz",
  bom: "Tranquilo",
  normal: "Neutro",
  ruim: "Cansado",
  pessimo: "Estressado",
};
const MEAL_LABELS: Record<string, string> = {
  cafe: "Café da manhã",
  lanche_manha: "Lanche da manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche da tarde",
  jantar: "Jantar",
  outro: "Outro",
};

const GREEN = [45, 106, 79] as const;
const LIGHT_GREEN = [82, 183, 136] as const;
const ORANGE = [224, 122, 58] as const;
const GRAY = [120, 120, 120] as const;
const DARK = [40, 40, 40] as const;

export async function exportDiaryPdf(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const startISO = dayjs(startDate).startOf("day").toISOString();
  const endISO = dayjs(endDate).endOf("day").toISOString();

  const [
    mealsRes,
    watersRes,
    exercisesRes,
    sleepRes,
    weightsRes,
    moodsRes,
    habitsRes,
    habitLogsRes,
  ] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", startISO)
      .lte("logged_at", endISO)
      .order("logged_at"),
    supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", startISO)
      .lte("logged_at", endISO)
      .order("logged_at"),
    supabase
      .from("exercises")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", startISO)
      .lte("logged_at", endISO)
      .order("logged_at"),
    supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_date", startDate)
      .lte("logged_date", endDate)
      .order("logged_date"),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_date", startDate)
      .lte("logged_date", endDate)
      .order("logged_date"),
    supabase
      .from("mood_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_date", startDate)
      .lte("logged_date", endDate)
      .order("logged_date"),
    supabase.from("habits").select("*").eq("user_id", userId),
    supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_date", startDate)
      .lte("logged_date", endDate),
  ]);

  const meals = (mealsRes.data ?? []) as MealLog[];
  const waters = (watersRes.data ?? []) as WaterLog[];
  const exercises = (exercisesRes.data ?? []) as Exercise[];
  const sleeps = (sleepRes.data ?? []) as SleepLog[];
  const weights = (weightsRes.data ?? []) as WeightLog[];
  const moods = (moodsRes.data ?? []) as MoodLog[];
  const habits = (habitsRes.data ?? []) as Habit[];
  const habitLogs = (habitLogsRes.data ?? []) as HabitLog[];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 18;
  const cw = pw - m * 2;
  let y = 0;

  function checkPage(needed: number) {
    if (y + needed > ph - 15) {
      addFooter();
      doc.addPage();
      y = 18;
    }
  }

  function addFooter() {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Broto — Acompanhe seus hábitos e evolução diária", m, ph - 8);
    doc.text(`Página ${doc.getNumberOfPages()}`, pw - m, ph - 8, {
      align: "right",
    });
  }

  function fmtDate(date: string) {
    return dayjs(date)
      .format("ddd, DD/MM")
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  function tableLine() {
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(m, y, m + cw, y);
  }

  // ==================== HEADER ====================
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 34, "F");

  // Logo completa (ícone + texto) renderizada via canvas
  const lx = m;
  const ly = 5;
  const logoImg = await renderLogoImage();
  doc.addImage(logoImg, "PNG", lx, ly, 36, 8);

  // Subtítulo
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(216, 243, 220);
  doc.text("Relatório do Diário", lx, ly + 18);

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(endDate).format("DD/MM/YYYY")}`,
    pw - m,
    ly + 5,
    { align: "right" },
  );
  doc.setTextColor(216, 243, 220);
  doc.text(
    `Gerado em ${dayjs().format("DD/MM/YYYY [às] HH:mm")}`,
    pw - m,
    ly + 9,
    { align: "right" },
  );

  y = 40;

  // ==================== HELPERS ====================
  function sectionHeader(
    title: string,
    color: readonly [number, number, number],
  ) {
    checkPage(16);
    doc.setFillColor(...color);
    doc.rect(m, y, cw, 0.6, "F");
    y += 5;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(title, m, y);
    y += 8;
  }

  // ==================== REFEIÇÕES ====================
  if (meals.length > 0) {
    sectionHeader("Refeições", GREEN);

    const mealsByDay = new Map<string, MealLog[]>();
    for (const ml of meals) {
      const d = dayjs(ml.logged_at).format("YYYY-MM-DD");
      if (!mealsByDay.has(d)) mealsByDay.set(d, []);
      mealsByDay.get(d)!.push(ml);
    }

    for (const [date, dayMeals] of mealsByDay) {
      checkPage(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(date), m + 2, y);
      const totalCal = dayMeals.reduce((a, ml) => a + (ml.calories ?? 0), 0);
      if (totalCal > 0) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.text(`${totalCal} kcal`, pw - m, y, { align: "right" });
      }
      y += 5;

      for (const ml of dayMeals) {
        checkPage(8);
        const label = MEAL_LABELS[ml.meal_type] || ml.meal_type;
        const time = dayjs(ml.logged_at).format("HH:mm");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...DARK);
        doc.text(`${label}  ${time}`, m + 4, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        const cal = ml.calories ? ` (${ml.calories} kcal)` : "";
        const descLines = doc.splitTextToSize(
          `${ml.description}${cal}`,
          cw - 8,
        );
        doc.text(descLines, m + 4, y);
        y += descLines.length * 3.8 + 2;
      }
      y += 2;
    }
    y += 2;
  }

  // ==================== HIDRATAÇÃO ====================
  if (waters.length > 0) {
    sectionHeader("Hidratação", LIGHT_GREEN);

    const waterByDay = new Map<string, number>();
    const waterCountByDay = new Map<string, number>();
    for (const w of waters) {
      const d = dayjs(w.logged_at).format("YYYY-MM-DD");
      waterByDay.set(d, (waterByDay.get(d) ?? 0) + w.amount_ml);
      waterCountByDay.set(d, (waterCountByDay.get(d) ?? 0) + 1);
    }

    // Cabeçalho tabela
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text("Data", m + 2, y);
    doc.text("Total", m + 50, y);
    doc.text("Registros", pw - m, y, { align: "right" });
    y += 2;
    tableLine();
    y += 4;

    for (const [date, total] of waterByDay) {
      checkPage(5);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(date), m + 2, y);
      doc.text(`${total} ml`, m + 50, y);
      doc.setTextColor(...GRAY);
      doc.text(`${waterCountByDay.get(date)}x`, pw - m, y, { align: "right" });
      y += 4.5;
    }

    const totalGeral = [...waterByDay.values()].reduce((a, b) => a + b, 0);
    y += 1;
    tableLine();
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...LIGHT_GREEN);
    doc.text(
      `Total no período: ${(totalGeral / 1000).toFixed(1)} litros`,
      m + 2,
      y,
    );
    y += 8;
  }

  // ==================== EXERCÍCIOS ====================
  if (exercises.length > 0) {
    sectionHeader("Exercícios", ORANGE);

    const exByDay = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const d = dayjs(ex.logged_at).format("YYYY-MM-DD");
      if (!exByDay.has(d)) exByDay.set(d, []);
      exByDay.get(d)!.push(ex);
    }

    for (const [date, dayEx] of exByDay) {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(date), m + 2, y);
      y += 5;
      for (const ex of dayEx) {
        checkPage(5);
        const label = EXERCISE_LABELS[ex.exercise_type] || ex.exercise_type;
        const cal = ex.calories ? ` | ${ex.calories} kcal` : "";
        const notes = ex.notes ? ` — ${ex.notes}` : "";
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        doc.text(`${label}: ${ex.duration_min} min${cal}${notes}`, m + 4, y);
        y += 4.5;
      }
      y += 2;
    }

    const totalMin = exercises.reduce((a, e) => a + e.duration_min, 0);
    const totalCal = exercises.reduce((a, e) => a + (e.calories ?? 0), 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ORANGE);
    let summary = `Total: ${Math.floor(totalMin / 60)}h${totalMin % 60}min`;
    if (totalCal > 0) summary += ` | ${totalCal} kcal`;
    doc.text(summary, m + 2, y);
    y += 8;
  }

  // ==================== SONO ====================
  if (sleeps.length > 0) {
    sectionHeader("Sono", [107, 114, 128]);

    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text("Data", m + 2, y);
    doc.text("Dormiu", m + 45, y);
    doc.text("Acordou", m + 65, y);
    doc.text("Duração", pw - m, y, { align: "right" });
    y += 2;
    tableLine();
    y += 4;

    let totalMinutes = 0;
    for (const s of sleeps) {
      checkPage(5);
      let slept = dayjs(s.slept_at);
      const woke = dayjs(s.woke_at);
      if (woke.isBefore(slept)) slept = slept.subtract(1, "day");
      const diff = woke.diff(slept, "minute");
      totalMinutes += diff;
      const h = Math.floor(diff / 60);
      const min = diff % 60;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(s.logged_date), m + 2, y);
      doc.text(dayjs(s.slept_at).format("HH:mm"), m + 45, y);
      doc.text(dayjs(s.woke_at).format("HH:mm"), m + 65, y);
      doc.text(`${h}h${min > 0 ? `${min}min` : ""}`, pw - m, y, {
        align: "right",
      });
      y += 4.5;
    }

    y += 1;
    tableLine();
    y += 4;
    const avgMin = Math.round(totalMinutes / sleeps.length);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Média: ${Math.floor(avgMin / 60)}h${avgMin % 60}min por noite`,
      m + 2,
      y,
    );
    y += 8;
  }

  // ==================== PESO ====================
  if (weights.length > 0) {
    sectionHeader("Peso", [236, 72, 153]);

    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text("Data", m + 2, y);
    doc.text("Peso", pw - m, y, { align: "right" });
    y += 2;
    tableLine();
    y += 4;

    for (const w of weights) {
      checkPage(5);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(w.logged_date), m + 2, y);
      doc.text(`${w.weight_kg} kg`, pw - m, y, { align: "right" });
      y += 4.5;
    }

    if (weights.length >= 2) {
      const diff = weights[weights.length - 1].weight_kg - weights[0].weight_kg;
      const sign = diff > 0 ? "+" : "";
      y += 1;
      tableLine();
      y += 4;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(236, 72, 153);
      doc.text(`Variação: ${sign}${diff.toFixed(1)} kg`, m + 2, y);
    }
    y += 8;
  }

  // ==================== HUMOR ====================
  if (moods.length > 0) {
    sectionHeader("Humor", LIGHT_GREEN);

    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text("Data", m + 2, y);
    doc.text("Como se sentiu", m + 50, y);
    y += 2;
    tableLine();
    y += 4;

    for (const mood of moods) {
      checkPage(5);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(mood.logged_date), m + 2, y);
      doc.text(MOOD_LABELS[mood.mood], m + 50, y);
      y += 4.5;
    }
    y += 4;
  }

  // ==================== HÁBITOS ====================
  if (habitLogs.length > 0 && habits.length > 0) {
    sectionHeader("Hábitos", GREEN);

    for (const habit of habits) {
      const logs = habitLogs.filter((hl) => hl.habit_id === habit.id);
      if (logs.length === 0) continue;

      checkPage(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(habit.title, m + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`${logs.length} dia(s)`, pw - m, y, { align: "right" });
      y += 5;

      const dates = logs
        .map((l) => dayjs(l.logged_date).format("DD/MM"))
        .join("  ·  ");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const dateLines = doc.splitTextToSize(dates, cw - 4);
      doc.text(dateLines, m + 4, y);
      y += dateLines.length * 3.5 + 4;
    }
  }

  addFooter();

  const fileName = `broto-diario-${dayjs(startDate).format("DDMM")}-a-${dayjs(endDate).format("DDMM-YYYY")}.pdf`;
  doc.save(fileName);
}
