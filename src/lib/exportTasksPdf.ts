import jsPDF from "jspdf";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "./supabaseClient";
import { renderLogoImage } from "./pdfLogo";
import type { Task } from "../types";

dayjs.locale("pt-br");

const GREEN = [45, 106, 79] as const;
const GRAY = [120, 120, 120] as const;
const DARK = [40, 40, 40] as const;
const ORANGE = [224, 122, 58] as const;

export async function exportTasksPdf(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", dayjs(startDate).startOf("day").toISOString())
    .lte("created_at", dayjs(endDate).endOf("day").toISOString())
    .order("created_at", { ascending: true });

  const tasks = (data ?? []) as Task[];

  // Agrupar por categoria
  const listMap = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.category || "outro";
    if (!listMap.has(key)) listMap.set(key, []);
    listMap.get(key)!.push(t);
  }
  const lists = Array.from(listMap.entries());
  const activeLists = lists.filter(([, items]) =>
    items.some((t) => t.status !== "concluida"),
  );
  const completedLists = lists.filter(
    ([, items]) =>
      items.length > 0 && items.every((t) => t.status === "concluida"),
  );

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
  doc.text("Relatório de Tarefas", lx, ly + 18);

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
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "concluida").length;
  const pendingTasks = totalTasks - doneTasks;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

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
    `${totalTasks} tarefas  ·  ${doneTasks} concluídas (${pct}%)  ·  ${pendingTasks} pendentes  ·  ${lists.length} listas`,
    m + 4,
    y,
  );
  y += 12;

  // ==================== LISTAS EM ANDAMENTO ====================
  if (activeLists.length > 0) {
    sectionHeader("Em andamento", GREEN);

    for (const [listName, listTasks] of activeLists) {
      checkPage(10);
      const done = listTasks.filter((t) => t.status === "concluida").length;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(
        listName.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
        m + 2,
        y,
      );
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`${done}/${listTasks.length}`, pw - m, y, { align: "right" });
      y += 5;

      for (const task of listTasks) {
        checkPage(5);
        const isDone = task.status === "concluida";
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(
          isDone ? 160 : 40,
          isDone ? 160 : 40,
          isDone ? 160 : 40,
        );
        // Checkbox
        if (isDone) {
          doc.setFillColor(82, 183, 136);
          doc.rect(m + 4, y - 2.5, 3, 3, "F");
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.4);
          doc.line(m + 4.6, y - 0.8, m + 5.2, y - 0.2);
          doc.line(m + 5.2, y - 0.2, m + 6.6, y - 2);
        } else {
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.3);
          doc.rect(m + 4, y - 2.5, 3, 3);
        }
        doc.text(task.title, m + 9, y);
        y += 4.5;
      }
      y += 3;
      tableLine();
      y += 4;
    }
  }

  // ==================== LISTAS CONCLUÍDAS ====================
  if (completedLists.length > 0) {
    sectionHeader(`Concluídas (${completedLists.length})`, [82, 183, 136]);

    for (const [listName, listTasks] of completedLists) {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(
        listName.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
        m + 2,
        y,
      );
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`${listTasks.length} item(s)`, pw - m, y, { align: "right" });
      y += 5;

      for (const task of listTasks) {
        checkPage(4.5);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        // Checkbox concluído
        doc.setFillColor(82, 183, 136);
        doc.rect(m + 4, y - 2.5, 3, 3, "F");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.line(m + 4.6, y - 0.8, m + 5.2, y - 0.2);
        doc.line(m + 5.2, y - 0.2, m + 6.6, y - 2);
        doc.text(task.title, m + 9, y);
        y += 4.5;
      }
      y += 3;
      tableLine();
      y += 4;
    }
  }

  addFooter();

  const fileName = `broto-tarefas-${dayjs(startDate).format("DDMM")}-a-${dayjs(endDate).format("DDMM-YYYY")}.pdf`;
  doc.save(fileName);
}
