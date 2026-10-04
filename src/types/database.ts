/**
 * Tipos do banco, espelhando supabase/migrations.
 * Quando o projeto Supabase estiver no ar, dá para regerar com:
 *   npx supabase gen types typescript --project-id SEU_REF > src/types/database.ts
 */

export type Goal = 'hipertrofia' | 'forca' | 'emagrecimento' | 'condicionamento'

export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'pernas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'abdomen'
  | 'gluteos'

export interface Profile {
  id: string
  name: string
  weight_kg: number | null
  height_cm: number | null
  goal: Goal | null
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  /** null => exercício global da biblioteca; preenchido => personalizado do usuário */
  user_id: string | null
  name: string
  muscle_group: MuscleGroup
  equipment: string
  instructions: string | null
  created_at: string
}

export interface Routine {
  id: string
  user_id: string
  name: string
  notes: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  position: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  notes: string | null
  created_at: string
}

/** routine_exercises com o exercício já embutido (select com join). */
export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise
}

export interface RoutineWithExercises extends Routine {
  routine_exercises: RoutineExerciseWithExercise[]
}

export interface Workout {
  id: string
  user_id: string
  routine_id: string | null
  name: string
  started_at: string
  finished_at: string | null
  duration_seconds: number | null
  notes: string | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  user_id: string
  set_number: number
  weight_kg: number
  reps: number
  done: boolean
  performed_at: string
}

export interface BodyMeasurement {
  id: string
  user_id: string
  measured_on: string
  weight_kg: number | null
  chest_cm: number | null
  waist_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  notes: string | null
  created_at: string
}

export interface PersonalRecord {
  user_id: string
  exercise_id: string
  weight_kg: number
  reps: number
  performed_at: string
}

/** Retorno de public.last_sets_for_exercises() */
export interface LastSetRow {
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  performed_at: string
}

/** Retorno de public.weekly_stats() */
export interface WeeklyStatRow {
  week_start: string
  volume_kg: number
  sets_count: number
  reps_count: number
  workouts_count: number
}

/** Retorno de public.exercise_progress() */
export interface ExerciseProgressRow {
  performed_on: string
  best_weight: number
  best_reps: number | null
  volume_kg: number
}

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'peito', label: 'Peito' },
  { value: 'costas', label: 'Costas' },
  { value: 'pernas', label: 'Pernas' },
  { value: 'ombros', label: 'Ombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'gluteos', label: 'Glúteos' },
]

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'forca', label: 'Força' },
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'condicionamento', label: 'Condicionamento' },
]

export function muscleGroupLabel(group: MuscleGroup): string {
  return MUSCLE_GROUPS.find((g) => g.value === group)?.label ?? group
}

export function goalLabel(goal: Goal): string {
  return GOALS.find((g) => g.value === goal)?.label ?? goal
}
