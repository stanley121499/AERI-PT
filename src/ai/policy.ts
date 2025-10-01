/**
 * AI Planning Layer - Policy & Rules
 * 
 * Pure helper functions that encode hard planning rules:
 * - Cadence management (max consecutive training days)
 * - Event tapers (avoid hard lower body before/after high-intensity events)
 * - Recovery insertion
 * - Tag inference and utilities
 */

import {
  AIPlanDay,
  AIPlan,
  PlanningConstraints,
  PlanningContext,
  UserEvent,
} from "./types";

// ============================================================================
// Default Constraints
// ============================================================================

export const DEFAULT_CONSTRAINTS: PlanningConstraints = {
  minRestBeforeRunHours: 24,
  minRestAfterRunHours: 24,
  maxConsecutiveTrainingDays: 3,
};

// ============================================================================
// Event Analysis
// ============================================================================

/**
 * Detect if an event is high-intensity based on label, intensity field, or tags
 */
export function isHighIntensityEvent(event: UserEvent): boolean {
  // Check explicit intensity field
  if (event.intensity && ["high", "hard", "intense"].includes(event.intensity.toLowerCase())) {
    return true;
  }

  // Check label for keywords
  const label = event.label.toLowerCase();
  const highIntensityKeywords = [
    "race",
    "run",
    "sprint",
    "game",
    "match",
    "competition",
    "futsal",
    "soccer",
    "basketball",
    "tennis",
    "hike",
  ];

  if (highIntensityKeywords.some((keyword) => label.includes(keyword))) {
    return true;
  }

  // Check tags
  const tags = event.tags || [];
  const highIntensityTags = ["run", "race", "game", "sprint", "competition"];
  if (tags.some((tag) => highIntensityTags.includes(tag.toLowerCase()))) {
    return true;
  }

  return false;
}

/**
 * Infer tags from event label (e.g., "Park Run" → ["run", "cardio"])
 */
export function eventTags(event: UserEvent): string[] {
  const inferred: string[] = [];
  const label = event.label.toLowerCase();

  // Existing tags
  if (event.tags && event.tags.length > 0) {
    inferred.push(...event.tags);
  }

  // Infer from label
  if (label.includes("run") || label.includes("race")) inferred.push("run");
  if (label.includes("futsal") || label.includes("soccer")) inferred.push("futsal");
  if (label.includes("game") || label.includes("match")) inferred.push("game");
  if (label.includes("hike")) inferred.push("hike");
  if (label.includes("yoga")) inferred.push("yoga");
  if (label.includes("pilates")) inferred.push("pilates");
  if (label.includes("swim")) inferred.push("swim");
  if (label.includes("cycle") || label.includes("bike")) inferred.push("cycle");
  if (label.includes("climb")) inferred.push("climb");

  // Deduplicate
  return Array.from(new Set(inferred));
}

/**
 * Check if tags involve lower-body strength/intensity
 */
export function hasLowerBodyStrength(tags: string[]): boolean {
  const lowerBodyTags = ["lower", "legs", "squat", "deadlift", "lunge"];
  return tags.some((tag) => lowerBodyTags.includes(tag.toLowerCase()));
}

// ============================================================================
// Cadence Enforcement
// ============================================================================

/**
 * Enforce max consecutive training days.
 * If we see >maxConsecutiveTrainingDays in a row, convert the excess to recovery.
 */
export function enforceCadence(
  days: AIPlanDay[],
  constraints: PlanningConstraints = DEFAULT_CONSTRAINTS
): AIPlanDay[] {
  const result: AIPlanDay[] = JSON.parse(JSON.stringify(days)); // deep clone
  let consecutiveTrainCount = 0;

  for (let i = 0; i < result.length; i++) {
    const day = result[i];

    if (day.action === "train") {
      consecutiveTrainCount++;

      if (consecutiveTrainCount > constraints.maxConsecutiveTrainingDays) {
        // Convert to recovery
        result[i] = {
          ...day,
          action: "recovery",
          tags: ["mobility"],
          reason: "Enforced recovery after consecutive training days",
        };
        consecutiveTrainCount = 0; // reset
      }
    } else {
      // Reset count on non-train days
      consecutiveTrainCount = 0;
    }
  }

  return result;
}

// ============================================================================
// Event Taper
// ============================================================================

/**
 * Avoid hard lower-body strength/conditioning within ~24-48h before/after high-intensity events.
 * Convert risky training days to recovery (mobility/yoga).
 */
export function taperAroundEvents(
  days: AIPlanDay[],
  context: PlanningContext,
  constraints: PlanningConstraints = DEFAULT_CONSTRAINTS
): AIPlanDay[] {
  const result: AIPlanDay[] = JSON.parse(JSON.stringify(days));

  // Build a map of date -> event
  const eventMap = new Map<string, UserEvent>();
  for (const event of context.events) {
    eventMap.set(event.date, event);
  }

  // For each day, check if it's near a high-intensity event
  for (let i = 0; i < result.length; i++) {
    const day = result[i];

    if (day.action !== "train") {
      continue; // only check training days
    }

    const dayDate = new Date(day.date);
    let shouldTaper = false;

    // Check events within ±1 day (24-48h window)
    for (const event of context.events) {
      if (!isHighIntensityEvent(event)) continue;

      const eventDate = new Date(event.date);
      const diffMs = Math.abs(dayDate.getTime() - eventDate.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays <= 1.5) {
        // within ~36h
        // Check if training involves lower body
        if (hasLowerBodyStrength(day.tags)) {
          shouldTaper = true;
          break;
        }

        // Also taper high-intensity conditioning on event day
        if (diffDays < 0.5 && day.tags.some((t) => ["conditioning", "run"].includes(t))) {
          shouldTaper = true;
          break;
        }
      }
    }

    if (shouldTaper) {
      result[i] = {
        ...day,
        action: "recovery",
        tags: ["mobility"],
        reason: `Taper for nearby event (${eventMap.get(day.date)?.label || "event"})`,
      };
    }
  }

  return result;
}

// ============================================================================
// Recovery Insertion
// ============================================================================

/**
 * Ensure recovery days are inserted at least every 3-4 days
 */
export function ensureRecovery(days: AIPlanDay[]): AIPlanDay[] {
  const result: AIPlanDay[] = JSON.parse(JSON.stringify(days));
  let daysSinceRecovery = 0;

  for (let i = 0; i < result.length; i++) {
    const day = result[i];

    if (day.action === "recovery" || day.action === "rest") {
      daysSinceRecovery = 0;
    } else if (day.action === "train") {
      daysSinceRecovery++;

      if (daysSinceRecovery >= 4) {
        // Force recovery
        result[i] = {
          ...day,
          action: "recovery",
          tags: ["mobility", "yoga"],
          reason: "Inserted recovery after consecutive training",
        };
        daysSinceRecovery = 0;
      }
    }
  }

  return result;
}

// ============================================================================
// Tag Utilities
// ============================================================================

/**
 * Normalize and clean tags
 */
export function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    )
  );
}

/**
 * Map unknown/free-form tags to known safe categories
 */
export function mapToSafeFocus(tags: string[]): string {
  const normalized = normalizeTags(tags);

  // Priority order: specific → general
  if (normalized.some((t) => ["upper", "push", "pull"].includes(t))) return "upper";
  if (normalized.some((t) => ["lower", "legs", "squat"].includes(t))) return "lower";
  if (normalized.some((t) => ["full", "fullbody", "total"].includes(t))) return "full";
  if (normalized.some((t) => ["conditioning", "cardio", "metcon"].includes(t))) return "conditioning";
  if (normalized.some((t) => ["mobility", "stretch", "flexibility"].includes(t))) return "mobility";
  if (normalized.some((t) => ["yoga"].includes(t))) return "yoga";
  if (normalized.some((t) => ["pilates"].includes(t))) return "pilates";
  if (normalized.some((t) => ["calisthenics", "bodyweight"].includes(t))) return "calisthenics";

  // Unknown tags: map to safe focus
  if (normalized.some((t) => ["climb", "climbing"].includes(t))) return "pull"; // climbing → pull focus
  if (normalized.some((t) => ["boxing", "mma"].includes(t))) return "conditioning";
  if (normalized.some((t) => ["cycle", "bike"].includes(t))) return "conditioning";
  if (normalized.some((t) => ["run", "running"].includes(t))) return "conditioning";
  if (normalized.some((t) => ["swim", "swimming"].includes(t))) return "conditioning";

  // Default fallback
  return "full";
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a plan meets basic requirements
 */
export function validatePlan(plan: AIPlan, context: PlanningContext): string[] {
  const errors: string[] = [];

  // Check plan length
  if (plan.plan.length !== context.horizon_days) {
    errors.push(
      `Plan length (${plan.plan.length}) doesn't match horizon (${context.horizon_days})`
    );
  }

  // Check dates are sequential
  const startDate = new Date(context.today);
  for (let i = 0; i < plan.plan.length; i++) {
    const expectedDate = new Date(startDate);
    expectedDate.setDate(startDate.getDate() + i);
    const expected = expectedDate.toISOString().split("T")[0];

    if (plan.plan[i].date !== expected) {
      errors.push(`Day ${i} date mismatch: expected ${expected}, got ${plan.plan[i].date}`);
    }
  }

  // Check all days have valid actions
  for (const day of plan.plan) {
    if (!["train", "recovery", "rest", "event"].includes(day.action)) {
      errors.push(`Invalid action "${day.action}" on ${day.date}`);
    }
  }

  return errors;
}

