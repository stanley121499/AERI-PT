/**
 * AI Planning Layer - Planner Brain
 * 
 * The "brain" that decides daily actions and tags over a horizon.
 * Two implementations:
 * - OpenAIPlannerBrain: Uses OpenAI to generate intelligent plans
 * - StubPlannerBrain: Deterministic fallback when no API key
 */

import {
  AIPlan,
  AIPlanDay,
  PlanningContext,
} from "./types";
import {
  DEFAULT_CONSTRAINTS,
  enforceCadence,
  taperAroundEvents,
  eventTags,
} from "./policy";
import { callJSON, isOpenAIAvailable, getDefaultPlannerModel } from "./openaiClient";

// ============================================================================
// Planner Brain Interface
// ============================================================================

export interface PlannerBrain {
  plan(context: PlanningContext): Promise<AIPlan>;
}

// ============================================================================
// OpenAI-Backed Planner Brain
// ============================================================================

export class OpenAIPlannerBrain implements PlannerBrain {
  constructor(private model: string = getDefaultPlannerModel()) {}

  async plan(context: PlanningContext): Promise<AIPlan> {
    if (!isOpenAIAvailable()) {
      throw new Error("OpenAI not available. Use StubPlannerBrain as fallback.");
    }

    // Build prompt
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);

    // Call OpenAI
    const schema = this.buildSchema();
    let rawPlan: AIPlan;

    try {
      rawPlan = await callJSON<AIPlan>(
        this.model,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        schema,
        {
          temperature: 0.7,
          maxTokens: 2000,
          retries: 2,
        }
      );
    } catch (error) {
      console.error("OpenAI planner brain failed:", error);
      throw error;
    }

    // Apply policy guards
    let correctedPlan = rawPlan.plan;
    correctedPlan = enforceCadence(correctedPlan, DEFAULT_CONSTRAINTS);
    correctedPlan = taperAroundEvents(correctedPlan, context, DEFAULT_CONSTRAINTS);

    return {
      plan: correctedPlan,
      notes: rawPlan.notes,
    };
  }

  private buildSystemPrompt(): string {
    return `You are an expert training planner for fitness and strength athletes.

Your task: Generate a 7-14 day microcycle that maximizes performance and recovery.

**HARD RULES (must follow):**
1. Avoid hard lower-body strength (squat, deadlift, lunge focus) within 24-48h before/after high-intensity run/game-like events
2. Insert recovery (rest/mobility/yoga) at least every 3-4 days
3. If an event exists for a date, prefer not to add another conditioning session that day (mobility/yoga is okay)
4. Weekly frequency is a target, allowed to flex ±1 when events or fatigue demand it
5. Never schedule more than 3 consecutive training days

**Actions:**
- "train": strength or conditioning training
- "recovery": mobility, yoga, pilates (active recovery)
- "rest": complete rest day
- "event": user's scheduled event (e.g., Park Run)

**Tags:**
Use free-form tags to describe the focus. Examples:
- Strength: "upper", "lower", "push", "pull", "legs", "full"
- Conditioning: "conditioning", "cardio", "metcon"
- Recovery: "mobility", "yoga", "pilates", "stretch"
- Specific: "climb", "run", "boxing", "calisthenics"

DO NOT invent exercise names, sets, or reps. Tags are descriptive only.

**Output:**
Strict JSON only. No prose, no explanations outside the JSON structure.`;
  }

  private buildUserPrompt(context: PlanningContext): string {
    // Clean context for JSON
    const cleanContext = {
      today: context.today,
      horizon_days: context.horizon_days,
      profile: {
        goal: context.profile.goal || "general fitness",
        frequency_per_week: context.profile.frequency_per_week || 3,
        accessible_equipment: context.profile.accessible_equipment || "full gym",
        dislikes: context.profile.dislikes || "none",
        session_length_min: context.profile.session_length_min || 60,
      },
      events: context.events.map((e) => ({
        date: e.date,
        label: e.label,
        intensity: e.intensity || "medium",
        tags: e.tags || [],
      })),
      recent_history: context.recent_history.slice(-7).map((h) => ({
        date: h.date,
        focus: h.focus || "unknown",
        completed: h.completed ?? true,
        soreness: h.soreness || null,
        rpe: h.rpe || null,
      })),
    };

    return `Generate a ${context.horizon_days}-day training plan starting from ${context.today}.

Context:
${JSON.stringify(cleanContext, null, 2)}

Return JSON matching this schema:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "action": "train" | "recovery" | "rest" | "event",
      "tags": ["tag1", "tag2"],
      "reason": "short explanation (optional)"
    }
  ],
  "notes": "overall plan notes (≤200 chars, optional)"
}`;
  }

  private buildSchema(): string {
    return `{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "action": "train" | "recovery" | "rest" | "event",
      "tags": ["tag1", "tag2"],
      "reason": "optional short explanation"
    }
  ],
  "notes": "optional overall notes (≤200 chars)"
}`;
  }
}

// ============================================================================
// Stub Planner Brain (Deterministic Fallback)
// ============================================================================

export class StubPlannerBrain implements PlannerBrain {
  async plan(context: PlanningContext): Promise<AIPlan> {
    const plan: AIPlanDay[] = [];
    const startDate = new Date(context.today);
    const frequency = context.profile.frequency_per_week || 3;

    // Build event map
    const eventMap = new Map<string, boolean>();
    for (const event of context.events) {
      eventMap.set(event.date, true);
    }

    // Simple pattern: train on Mon/Wed/Fri if frequency=3, adjust for events
    let trainDaysPerWeek: number[] = [];

    if (frequency >= 5) {
      trainDaysPerWeek = [1, 2, 3, 4, 5]; // Mon-Fri
    } else if (frequency === 4) {
      trainDaysPerWeek = [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
    } else if (frequency === 3) {
      trainDaysPerWeek = [1, 3, 5]; // Mon, Wed, Fri
    } else if (frequency === 2) {
      trainDaysPerWeek = [1, 4]; // Mon, Thu
    } else {
      trainDaysPerWeek = [3]; // Wed
    }

    let consecutiveTrainDays = 0;

    for (let i = 0; i < context.horizon_days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();

      // Check if event exists
      if (eventMap.has(dateStr)) {
        const event = context.events.find((e) => e.date === dateStr);
        plan.push({
          date: dateStr,
          action: "event",
          tags: event ? eventTags(event) : ["event"],
          reason: event?.label || "User event",
        });
        consecutiveTrainDays = 0;
        continue;
      }

      // Check if we should train today
      const shouldTrain = trainDaysPerWeek.includes(dayOfWeek);

      if (shouldTrain && consecutiveTrainDays < 3) {
        // Alternate upper/lower
        const isUpperDay = i % 2 === 0;
        plan.push({
          date: dateStr,
          action: "train",
          tags: isUpperDay ? ["upper", "push"] : ["lower", "legs"],
          reason: "Scheduled training",
        });
        consecutiveTrainDays++;
      } else if (consecutiveTrainDays >= 3) {
        // Force recovery after 3 consecutive days
        plan.push({
          date: dateStr,
          action: "recovery",
          tags: ["mobility"],
          reason: "Recovery after consecutive training",
        });
        consecutiveTrainDays = 0;
      } else {
        // Rest day
        plan.push({
          date: dateStr,
          action: "rest",
          tags: [],
          reason: "Scheduled rest",
        });
        consecutiveTrainDays = 0;
      }
    }

    // Apply policy guards
    let correctedPlan = plan;
    correctedPlan = enforceCadence(correctedPlan, DEFAULT_CONSTRAINTS);
    correctedPlan = taperAroundEvents(correctedPlan, context, DEFAULT_CONSTRAINTS);

    return {
      plan: correctedPlan,
      notes: "Generated by deterministic fallback planner (no AI)",
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create the appropriate planner brain based on OpenAI availability
 */
export function createPlannerBrain(model?: string): PlannerBrain {
  if (isOpenAIAvailable()) {
    return new OpenAIPlannerBrain(model);
  } else {
    console.log("OpenAI not available. Using stub planner brain.");
    return new StubPlannerBrain();
  }
}

