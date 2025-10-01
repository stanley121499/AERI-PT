/**
 * AI Planning Layer - Orchestrator
 * 
 * High-level function that orchestrates the entire planning pipeline:
 * 1. Planner Brain (AI or stub) → generates daily actions/tags
 * 2. Policy Guards → enforce hard rules
 * 3. Exercise Generator (AI) → generates concrete exercises with sets/reps/weights
 * 
 * Returns CompiledDay[] ready for insertion (no DB side effects).
 * 
 * Note: RIR (Reps in Reserve) is intentionally left null - users fill this during workouts.
 */

import {
  PlanningContext,
  CompiledDay,
  DayAction,
} from "./types";
import { createPlannerBrain } from "./plannerBrain";
import { enforceCadence, taperAroundEvents, validatePlan, DEFAULT_CONSTRAINTS } from "./policy";
import { chooseThemeFromTags } from "./compiler";
import { isOpenAIAvailable } from "./openaiClient";
import { generateExercisesWithAI } from "./exerciseGenerator";

// ============================================================================
// Options
// ============================================================================

export interface PlanAndCompileOptions {
  horizonDays?: number;        // default 14
  aiPlannerModel?: string;     // e.g., 'gpt-4o-mini'
  aiSeasoning?: boolean;       // default true
  aiSeasoningModel?: string;   // seasoning model override
}

// ============================================================================
// Main Orchestrator Function
// ============================================================================

/**
 * Plan and compile a training microcycle.
 * 
 * @param context - Planning context (user profile, events, history)
 * @param options - Configuration options
 * @returns Array of compiled days with concrete exercises
 */
export async function planAndCompile(
  context: PlanningContext,
  options: PlanAndCompileOptions = {}
): Promise<CompiledDay[]> {
  const {
    horizonDays = 14,
    aiPlannerModel,
    aiSeasoning = true,
    aiSeasoningModel,
  } = options;

  // Update context with horizon
  const contextWithHorizon: PlanningContext = {
    ...context,
    horizon_days: horizonDays,
  };

  console.log(`[AI Planner] Starting planning for ${horizonDays} days from ${context.today}`);
  console.log(`[AI Planner] OpenAI available: ${isOpenAIAvailable()}`);

  // ============================================================================
  // STEP 1: Choose Planner Brain
  // ============================================================================
  
  const planner = createPlannerBrain(aiPlannerModel);
  console.log(`[AI Planner] Using planner: ${planner.constructor.name}`);

  // ============================================================================
  // STEP 2: Generate Plan
  // ============================================================================
  
  let plan;
  try {
    plan = await planner.plan(contextWithHorizon);
  } catch (error) {
    console.error("[AI Planner] Planner failed:", error);
    throw new Error(`Planning failed: ${error}`);
  }

  console.log(`[AI Planner] Generated plan with ${plan.plan.length} days`);

  // ============================================================================
  // STEP 3: Apply Policy Guards (Defensive)
  // ============================================================================
  
  let guardedPlan = plan.plan;
  guardedPlan = enforceCadence(guardedPlan, DEFAULT_CONSTRAINTS);
  guardedPlan = taperAroundEvents(guardedPlan, contextWithHorizon, DEFAULT_CONSTRAINTS);

  // Validate plan
  const errors = validatePlan({ plan: guardedPlan, notes: plan.notes }, contextWithHorizon);
  if (errors.length > 0) {
    console.warn("[AI Planner] Plan validation warnings:", errors);
  }

  // ============================================================================
  // STEP 4: Compile Each Day
  // ============================================================================
  
  const compiledDays: CompiledDay[] = [];

  for (const day of guardedPlan) {
    const compiledDay = await compileDayWithExercises(
      day.action,
      day.date,
      day.tags,
      contextWithHorizon,
      { aiSeasoning, aiSeasoningModel }
    );

    compiledDays.push(compiledDay);
  }

  console.log(`[AI Planner] Compiled ${compiledDays.length} days`);

  return compiledDays;
}

// ============================================================================
// Helper: Compile Single Day
// ============================================================================

async function compileDayWithExercises(
  action: DayAction,
  date: string,
  tags: string[],
  context: PlanningContext,
  options: { aiSeasoning: boolean; aiSeasoningModel?: string }
): Promise<CompiledDay> {
  // For rest/event days, return empty exercises
  if (action === "rest" || action === "event") {
    return {
      date,
      action,
      focus: action,
      tags,
      exercises: [],
      meta: {},
    };
  }

  // For train/recovery days, generate exercises with AI
  const focus = chooseThemeFromTags(tags);
  let exercises = await generateExercisesWithAI({
    focus,
    tags,
    profile: context.profile,
    sessionLengthMin: context.profile.session_length_min || 60,
  });

  // Exercises are already AI-generated with cues and proper names
  // Seasoning step is no longer needed (kept in options for backwards compatibility)
  
  return {
    date,
    action,
    focus,
    tags,
    exercises,
    meta: {
      ai_generated: isOpenAIAvailable(),
    },
  };
}

// ============================================================================
// Helper: Estimate Total Duration
// ============================================================================

/**
 * Calculate total estimated duration for a compiled day (in minutes)
 */
export function estimateDayDuration(day: CompiledDay): number {
  const totalSeconds = day.exercises.reduce(
    (sum, ex) => sum + (ex.estimated_duration || 0),
    0
  );
  return Math.ceil(totalSeconds / 60);
}

// ============================================================================
// Helper: Get Training Summary
// ============================================================================

/**
 * Get summary statistics for a compiled plan
 */
export function getPlanSummary(days: CompiledDay[]): {
  totalDays: number;
  trainingDays: number;
  recoveryDays: number;
  restDays: number;
  eventDays: number;
  totalExercises: number;
  estimatedWeeklyHours: number;
} {
  const totalDays = days.length;
  const trainingDays = days.filter((d) => d.action === "train").length;
  const recoveryDays = days.filter((d) => d.action === "recovery").length;
  const restDays = days.filter((d) => d.action === "rest").length;
  const eventDays = days.filter((d) => d.action === "event").length;
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  const totalMinutes = days.reduce((sum, d) => sum + estimateDayDuration(d), 0);
  const estimatedWeeklyHours = (totalMinutes / 60) * (7 / totalDays);

  return {
    totalDays,
    trainingDays,
    recoveryDays,
    restDays,
    eventDays,
    totalExercises,
    estimatedWeeklyHours: Math.round(estimatedWeeklyHours * 10) / 10,
  };
}

// ============================================================================
// Export Helper for Easy Import
// ============================================================================

export type { PlanningContext, CompiledDay, UserProfile } from "./types";
export { userInfoToProfile, dbEventToUserEvent, dbWorkoutToHistoryDay } from "./types";

