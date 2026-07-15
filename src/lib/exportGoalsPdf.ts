import jsPDF from "jspdf";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "./supabaseClient";
import { renderLogoImage } from "./pdfLogo";
import type { Goal, Challenge, ChallengeCheckin } from "../types";

dayjs.locale("pt-br");

const GREEN = [45, 106, 79] as const;
const LIGHT_GREEN = [82, 183, 136] as const;
const ORANGE = [224, 122, 58] as const;
const GRAY = [120, 120, 120] as const;
const DARK = [40, 40, 40] as const;

export async function exportGoalsPdf(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const [goalsRes, challengesRes, checkinsRes] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", dayjs(startDate).startOf("day").toISOString())
      .lte("created_at", dayjs(endDate).endOf("day").toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("challenges")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", dayjs(startDate).startOf("day").toISOString())
      .lte("created_at", dayjs(endDate).endOf("day").toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("challenge_checkins")
      .select("*")
      .eq("user_id", userId)
      .gte("checkin_date", startDate)
      .lte("checkin_date", endDate),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const challenges = (challengesRes.data ?? []) as Challenge[];
  const checkins = (checkinsRes.data ?? []) as ChallengeCheckin[];

  const activeGoals = goals.filter((g) => g.status === "ativa");
  const completedGoals = goals.filter((g) => g.status === "concluida");

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

  function tableLine() {
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(m, y, m + cw, y);
  }

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

  // ==================== HEADER ====================
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 34, "F");

  const lx = m;
  const ly = 5;
  const logoImg = await renderLogoImage();
  doc.addImage(logoImg, "PNG", lx, ly, 36, 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(216, 243, 220);
  doc.text("Relatório de Metas & Desafios", lx, ly + 18);

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

  // ==================== RESUMO ====================
  checkPage(20);
  doc.setFillColor(245, 248, 245);
  doc.roundedRect(m, y, cw, 18, 2, 2, "F");
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Resumo do período", m + 4, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.text(
    `${goals.length} metas (${activeGoals.length} ativas, ${completedGoals.length} alcançadas)  ·  ${challenges.length} desafios`,
    m + 4,
    y,
  );
  y += 12;

  // ==================== METAS ATIVAS ====================
  if (activeGoals.length > 0) {
    sectionHeader("Metas ativas", GREEN);

    for (const g of activeGoals) {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(g.title, m + 2, y);
      if (g.target_date) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.text(
          `Prazo: ${dayjs(g.target_date).format("DD/MM/YYYY")}`,
          pw - m,
          y,
          { align: "right" },
        );
      }
      y += 5;
    }
    y += 3;
  }

  // ==================== METAS ALCANÇADAS ====================
  if (completedGoals.length > 0) {
    sectionHeader(`Metas alcançadas (${completedGoals.length})`, LIGHT_GREEN);

    for (const g of completedGoals) {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);

      // Checkbox concluído
      doc.setFillColor(...LIGHT_GREEN);
      doc.rect(m + 2, y - 2.2, 2.5, 2.5, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.35);
      doc.line(m + 2.5, y - 0.5, m + 3, y - 0.1);
      doc.line(m + 3, y - 0.1, m + 4.2, y - 1.7);

      doc.text(g.title, m + 7, y);
      if (g.target_date) {
        doc.text(
          `Prazo: ${dayjs(g.target_date).format("DD/MM/YYYY")}`,
          pw - m,
          y,
          { align: "right" },
        );
      }
      y += 5;
    }
    y += 3;
  }

  // ==================== DESAFIOS ====================
  if (challenges.length > 0) {
    sectionHeader("Desafios", ORANGE);

    for (const c of challenges) {
      checkPage(14);
      const totalDone = checkins.filter((k) => k.challenge_id === c.id).length;
      const pct = Math.min(100, Math.round((totalDone / c.target_count) * 100));

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(c.title, m + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(
        `${totalDone}/${c.target_count} dias (${pct}%)  ·  ${dayjs(c.start_date).format("DD/MM")} a ${dayjs(c.end_date).format("DD/MM")}`,
        pw - m,
        y,
        { align: "right" },
      );
      y += 4;

      // Barra de progresso
      doc.setFillColor(235, 235, 235);
      doc.roundedRect(m + 2, y, cw - 4, 2.5, 1, 1, "F");
      const barW = ((cw - 4) * pct) / 100;
      if (barW > 0) {
        doc.setFillColor(
          pct === 100 ? 82 : 224,
          pct === 100 ? 183 : 122,
          pct === 100 ? 136 : 58,
        );
        doc.roundedRect(m + 2, y, barW, 2.5, 1, 1, "F");
      }
      y += 7;
    }
  }

  addFooter();

  const fileName = `broto-metas-${dayjs(startDate).format("DDMM")}-a-${dayjs(endDate).format("DDMM-YYYY")}.pdf`;
  doc.save(fileName);
}
