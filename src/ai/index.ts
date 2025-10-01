/**
 * AI Planning Layer - Main Export
 * 
 * Single entry point for all AI planning functionality.
 */

// Main orchestrator function
export { planAndCompile, estimateDayDuration, getPlanSummary } from "./orchestrator";
export type { PlanAndCompileOptions } from "./orchestrator";

// Types
export type {
  UserProfile,
  UserEvent,
  HistoryDay,
  ExistingPlan,
  PlanningContext,
  DayAction,
  AIPlanDay,
  AIPlan,
  ExercisePlan,
  CompiledDay,
  PlanningConstraints,
  OpenAICallOptions,
} from "./types";

// Adapters
export {
  userInfoToProfile,
  dbEventToUserEvent,
  dbWorkoutToHistoryDay,
  exercisePlanToDbInsert,
} from "./types";

// Policy utilities (for advanced usage)
export {
  DEFAULT_CONSTRAINTS,
  isHighIntensityEvent,
  eventTags,
  hasLowerBodyStrength,
  enforceCadence,
  taperAroundEvents,
  ensureRecovery,
  normalizeTags,
  mapToSafeFocus,
  validatePlan,
} from "./policy";

// Exercise generator (AI-powered)
export { generateExercisesWithAI } from "./exerciseGenerator";

// Compiler utilities (legacy/fallback)
export {
  chooseThemeFromTags,
  compileExercises,
  isRecoveryFocus,
  estimateTotalDuration,
} from "./compiler";

// Seasoning utilities (legacy - no longer used by default)
export { seasonExercises, stripCue, extractCue } from "./seasoning";

// OpenAI client utilities
export { isOpenAIAvailable, getDefaultPlannerModel, getDefaultSeasoningModel } from "./openaiClient";

// Planner brain (for custom implementations)
export type { PlannerBrain } from "./plannerBrain";
export { createPlannerBrain, OpenAIPlannerBrain, StubPlannerBrain } from "./plannerBrain";

