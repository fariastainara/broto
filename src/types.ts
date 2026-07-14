export type MealType =
  | "cafe"
  | "lanche_manha"
  | "almoco"
  | "lanche_tarde"
  | "jantar"
  | "outro";

export interface MealLog {
  id: string;
  user_id: string;
  meal_type: MealType;
  description: string;
  calories: number | null;
  logged_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
}

export type ExerciseType =
  | "musculacao"
  | "caminhada"
  | "corrida"
  | "bicicleta"
  | "funcional"
  | "outro";

export interface Exercise {
  id: string;
  user_id: string;
  exercise_type: ExerciseType;
  duration_min: number;
  calories: number | null;
  notes: string | null;
  logged_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  slept_at: string;
  woke_at: string;
  logged_date: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_date: string;
}

export type MoodType = "excelente" | "bom" | "normal" | "ruim" | "pessimo";

export interface MoodLog {
  id: string;
  user_id: string;
  mood: MoodType;
  logged_date: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  icon: string | null;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  logged_date: string;
}

export interface UserSettings {
  id: string;
  water_goal_ml: number;
  sleep_goal_hours: number;
  notifications_enabled: boolean;
}

export type GoalStatus = "ativa" | "concluida" | "pausada";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
}

export interface Challenge {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  target_count: number;
  category: string | null;
  created_at: string;
}

export interface ChallengeCheckin {
  id: string;
  challenge_id: string;
  user_id: string;
  checkin_date: string;
  note: string | null;
}

export type TaskStatus =
  | "pendente"
  | "em_andamento"
  | "concluida"
  | "cancelada";
export type TaskPriority = "baixa" | "media" | "alta" | "urgente";
export type TaskCategory =
  | "casa"
  | "trabalho"
  | "faculdade"
  | "financeiro"
  | "saude"
  | "outro";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  notifications_enabled: boolean;
}

export interface MealPlanOption {
  id: string;
  user_id: string;
  meal_type: MealType;
  title: string;
  description: string | null;
  calories: number | null;
  sort_order: number;
  created_at: string;
}

// Estudos
export type CourseStatus =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido"
  | "pausado";

export interface Course {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  platform: string | null;
  instructor: string | null;
  total_hours: number | null;
  category: string | null;
  status: CourseStatus;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  duration_min: number | null;
  completed: boolean;
  sort_order: number;
}

export interface StudySession {
  id: string;
  user_id: string;
  course_id: string | null;
  started_at: string;
  ended_at: string;
  notes: string | null;
}

export interface SharedMealPlan {
  id: string;
  owner_id: string;
  shared_with_id: string;
  created_at: string;
}
