/**
 * AI Planning Layer - Type Definitions
 * 
 * This module defines all types used by the AI planning system.
 * It provides adapters to existing database types where appropriate.
 */

import { Database } from "../../database.types";

// ============================================================================
// Database Type Adapters
// ============================================================================

/** Adapter from database exercise insert type */
export type ExerciseDbInsert = Database["public"]["Tables"]["exercise"]["Insert"];

/** Adapter from database user_info row type */
export type UserInfoDb = Database["public"]["Tables"]["user_info"]["Row"];

/** Adapter from database user_events row type */
export type UserEventDb = Database["public"]["Tables"]["user_events"]["Row"];

/** Adapter from database workouts row type */
export type WorkoutDb = Database["public"]["Tables"]["workouts"]["Row"];

// ============================================================================
// AI Planner Input Types
// ============================================================================

/**
 * User profile information for planning.
 * Maps to database user_info but with simplified field names.
 */
export interface UserProfile {
  goal?: string | null;
  frequency_per_week?: number | null;
  accessible_equipment?: string | null;
  dislikes?: string | null;
  modalities_note?: string | null;
  session_length_min?: number | null;
}

/**
 * User event (e.g., "Park Run", "Futsal game")
 */
export interface UserEvent {
  date: string;              // YYYY-MM-DD
  label: string;             // e.g., "Park Run"
  intensity?: string | null; // e.g., "high", "medium", "low"
  tags?: string[] | null;    // e.g., ["run", "race"]
  notes?: string | null;
}

/**
 * Historical workout/training day
 */
export interface HistoryDay {
  date: string;           // YYYY-MM-DD
  focus?: string | null;  // e.g., "upper", "lower", "conditioning"
  completed?: boolean | null;
  soreness?: number | null; // 1-10 scale
  rpe?: number | null;      // rate of perceived exertion, 1-10
}

/**
 * Existing plan from a previous planner run
 */
export interface ExistingPlan {
  plan: AIPlanDay[];
  notes?: string | null;
}

/**
 * Complete planning context input
 */
export interface PlanningContext {
  today: string;                    // YYYY-MM-DD
  horizon_days: number;             // typically 7 or 14
  profile: UserProfile;
  events: UserEvent[];
  recent_history: HistoryDay[];
  existing_plan?: ExistingPlan | null;
}

// ============================================================================
// AI Planner Output Types
// ============================================================================

/**
 * Action type for a day in the plan
 */
export type DayAction = "train" | "recovery" | "rest" | "event";

/**
 * Single day in the AI-generated plan
 */
export interface AIPlanDay {
  date: string;           // YYYY-MM-DD
  action: DayAction;
  tags: string[];         // free-form tags like ["upper", "push"] or ["yoga"] or ["run"]
  reason?: string | null; // short explanation (optional)
}

/**
 * Complete AI planner output
 */
export interface AIPlan {
  plan: AIPlanDay[];
  notes?: string | null; // general notes about the plan (≤200 chars)
}

// ============================================================================
// Compiler Output Types
// ============================================================================

/**
 * Single exercise plan (no DB IDs yet)
 */
export interface ExercisePlan {
  name: string;                       // e.g., "Barbell Back Squat"
  sets?: number | null;
  reps?: number | null;
  rest_sec?: number | null;
  rir?: number | null;                // reps in reserve
  load_kg?: number | null;
  estimated_duration?: number | null; // seconds
  order_index?: number | null;
}

/**
 * Compiled day with concrete exercises
 */
export interface CompiledDay {
  date: string;                       // YYYY-MM-DD
  action: DayAction;
  focus: string;                      // e.g., "upper", "lower", "conditioning", "mobility"
  tags: string[];
  exercises: ExercisePlan[];          // empty for rest/event
  meta?: Record<string, unknown>;     // optional metadata
}

// ============================================================================
// Policy & Constraints
// ============================================================================

/**
 * Hard constraints for planning
 */
export interface PlanningConstraints {
  minRestBeforeRunHours: number;    // default 24
  minRestAfterRunHours: number;     // default 24
  maxConsecutiveTrainingDays: number; // default 3
}

// ============================================================================
// OpenAI Client Types
// ============================================================================

/**
 * OpenAI API call options
 */
export interface OpenAICallOptions {
  temperature?: number;
  maxTokens?: number;
  retries?: number; // default 2
}

// ============================================================================
// Adapters: Database → Planning Types
// ============================================================================

/**
 * Convert database user_info to UserProfile
 */
export function userInfoToProfile(userInfo: UserInfoDb): UserProfile {
  return {
    goal: userInfo.goal,
    frequency_per_week: userInfo.expected_frequency_per_week,
    accessible_equipment: userInfo.accessible_equipment,
    dislikes: userInfo.exercise_that_i_dont_like,
    modalities_note: (userInfo as any).exercise_modalities?.join(", ") || null,
    session_length_min: userInfo.expected_workout_duration_per_day_in_mins,
  };
}

/**
 * Convert database user_events to UserEvent
 */
export function dbEventToUserEvent(event: UserEventDb): UserEvent {
  return {
    date: event.date,
    label: event.label,
    intensity: event.intensity,
    tags: event.tags,
    notes: event.notes,
  };
}

/**
 * Convert database workout to HistoryDay
 */
export function dbWorkoutToHistoryDay(workout: WorkoutDb): HistoryDay {
  // Extract feedback data if available
  let soreness: number | null = null;
  let rpe: number | null = null;
  let completed: boolean | null = null;

  const workoutAny = workout as any;

  if (workoutAny.feedback) {
    try {
      const feedback = JSON.parse(workoutAny.feedback);
      soreness = feedback.soreness ?? null;
      rpe = feedback.rpe ?? null;
    } catch {
      // ignore parse errors
    }
  }

  completed = workoutAny.state === "completed" || workoutAny.state === "done";

  return {
    date: workoutAny.date || "",
    focus: workoutAny.focus,
    completed,
    soreness,
    rpe,
  };
}

/**
 * Convert ExercisePlan to database insert format
 */
export function exercisePlanToDbInsert(
  exercise: ExercisePlan,
  workoutId: string
): ExerciseDbInsert {
  return {
    workout_id: workoutId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    rest_sec: exercise.rest_sec,
    rir: exercise.rir,
    load_kg: exercise.load_kg,
    estimated_duration: exercise.estimated_duration,
    order_index: exercise.order_index,
    done: false,
  } as ExerciseDbInsert;
}

