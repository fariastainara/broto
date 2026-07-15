import jsPDF from "jspdf";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { supabase } from "./supabaseClient";
import { renderLogoImage } from "./pdfLogo";
import type {
  Course,
  CourseModule,
  CourseLesson,
  StudySession,
  CourseStatus,
} from "../types";

dayjs.locale("pt-br");

const GREEN = [45, 106, 79] as const;
const INDIGO = [99, 102, 241] as const;
const GRAY = [120, 120, 120] as const;
const DARK = [40, 40, 40] as const;

const STATUS_LABELS: Record<CourseStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
};

export async function exportStudiesPdf(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const startISO = dayjs(startDate).startOf("day").toISOString();
  const endISO = dayjs(endDate).endOf("day").toISOString();

  const [coursesRes, modulesRes, lessonsRes, sessionsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
    supabase.from("course_modules").select("*").order("sort_order"),
    supabase.from("course_lessons").select("*").order("sort_order"),
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("started_at", startISO)
      .lte("started_at", endISO)
      .order("started_at"),
  ]);

  const courses = (coursesRes.data ?? []) as Course[];
  const modules = (modulesRes.data ?? []) as CourseModule[];
  const lessons = (lessonsRes.data ?? []) as CourseLesson[];
  const sessions = (sessionsRes.data ?? []) as StudySession[];

  // Filtrar módulos e aulas dos cursos do usuário
  const courseIds = new Set(courses.map((c) => c.id));
  const userModules = modules.filter((m) => courseIds.has(m.course_id));
  const moduleIds = new Set(userModules.map((m) => m.id));
  const userLessons = lessons.filter((l) => moduleIds.has(l.module_id));

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

  function fmtDate(date: string) {
    return dayjs(date)
      .format("ddd, DD/MM")
      .replace(/^\w/, (c) => c.toUpperCase());
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
  doc.text("Relatório de Estudos", lx, ly + 18);

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
  const totalMin = sessions.reduce(
    (a, s) => a + dayjs(s.ended_at).diff(dayjs(s.started_at), "minute"),
    0,
  );
  const totalH = Math.floor(totalMin / 60);
  const totalM = totalMin % 60;
  const totalSessions = sessions.length;
  const activeCourses = courses.filter(
    (c) => c.status === "em_andamento",
  ).length;
  const completedCourses = courses.filter(
    (c) => c.status === "concluido",
  ).length;

  checkPage(20);
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(m, y, cw, 18, 2, 2, "F");
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INDIGO);
  doc.text("Resumo do período", m + 4, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const resumo = `${totalH}h${totalM}min estudados  ·  ${totalSessions} sessões  ·  ${courses.length} cursos (${activeCourses} em andamento, ${completedCourses} concluídos)`;
  doc.text(resumo, m + 4, y);
  y += 12;

  // ==================== SESSÕES DE ESTUDO ====================
  if (sessions.length > 0) {
    sectionHeader("Sessões de Estudo", INDIGO);

    // Agrupar por dia
    const sessionsByDay = new Map<string, StudySession[]>();
    for (const s of sessions) {
      const d = dayjs(s.started_at).format("YYYY-MM-DD");
      if (!sessionsByDay.has(d)) sessionsByDay.set(d, []);
      sessionsByDay.get(d)!.push(s);
    }

    for (const [date, daySessions] of sessionsByDay) {
      checkPage(10);
      const dayMin = daySessions.reduce(
        (a, s) => a + dayjs(s.ended_at).diff(dayjs(s.started_at), "minute"),
        0,
      );
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(fmtDate(date), m + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`${Math.floor(dayMin / 60)}h${dayMin % 60}min`, pw - m, y, {
        align: "right",
      });
      y += 5;

      for (const s of daySessions) {
        checkPage(6);
        const mins = dayjs(s.ended_at).diff(dayjs(s.started_at), "minute");
        const courseName = s.course_id
          ? (courses.find((c) => c.id === s.course_id)?.title ?? "—")
          : "Sessão livre";
        const time = `${dayjs(s.started_at).format("HH:mm")} — ${dayjs(s.ended_at).format("HH:mm")}`;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        doc.text(`${courseName}  (${time})  ${mins}min`, m + 4, y);
        if (s.notes) {
          y += 3.5;
          doc.setTextColor(...GRAY);
          doc.setFontSize(8);
          const noteLines = doc.splitTextToSize(s.notes, cw - 8);
          doc.text(noteLines, m + 4, y);
          y += noteLines.length * 3.5;
        }
        y += 4;
      }
      y += 1;
    }
  }

  // ==================== CURSOS ====================
  if (courses.length > 0) {
    sectionHeader("Cursos", GREEN);

    for (const course of courses) {
      checkPage(14);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(course.title, m + 2, y);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      const statusLabel = STATUS_LABELS[course.status];
      const details: string[] = [statusLabel];
      if (course.platform) details.push(course.platform);
      if (course.instructor) details.push(course.instructor);
      if (course.total_hours) details.push(`${course.total_hours}h`);
      doc.text(details.join("  ·  "), pw - m, y, { align: "right" });
      y += 6;

      // Módulos e aulas
      const courseMods = userModules.filter(
        (mod) => mod.course_id === course.id,
      );
      if (courseMods.length > 0) {
        for (const mod of courseMods) {
          checkPage(6);
          const modLessons = userLessons.filter((l) => l.module_id === mod.id);
          const completed = modLessons.filter((l) => l.completed).length;
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text(mod.title, m + 4, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...GRAY);
          doc.text(`${completed}/${modLessons.length} aulas`, pw - m, y, {
            align: "right",
          });
          y += 4;

          for (const lesson of modLessons) {
            checkPage(4.5);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(
              lesson.completed ? 120 : 40,
              lesson.completed ? 120 : 40,
              lesson.completed ? 120 : 40,
            );
            const dur = lesson.duration_min
              ? ` (${lesson.duration_min}min)`
              : "";
            if (lesson.completed) {
              doc.setFillColor(82, 183, 136);
              doc.rect(m + 6, y - 2.2, 2.5, 2.5, "F");
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(0.35);
              doc.line(m + 6.5, y - 0.5, m + 7, y - 0.1);
              doc.line(m + 7, y - 0.1, m + 8.2, y - 1.7);
            } else {
              doc.setDrawColor(180, 180, 180);
              doc.setLineWidth(0.25);
              doc.rect(m + 6, y - 2.2, 2.5, 2.5);
            }
            doc.text(`${lesson.title}${dur}`, m + 10, y);
            y += 4;
          }
          y += 2;
        }
      }

      y += 1;
      tableLine();
      y += 4;
    }
  }

  addFooter();

  const fileName = `broto-estudos-${dayjs(startDate).format("DDMM")}-a-${dayjs(endDate).format("DDMM-YYYY")}.pdf`;
  doc.save(fileName);
}
