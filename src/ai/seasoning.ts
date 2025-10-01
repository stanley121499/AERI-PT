/**
 * AI Planning Layer - Exercise Seasoning
 * 
 * Optional AI pass that:
 * - May swap exercise names when equipment/dislikes conflict
 * - Adds short coaching cues after exercise names
 * - NEVER changes numeric programming (sets, reps, rest, RIR, load)
 * 
 * Falls back gracefully when OpenAI is unavailable.
 */

import { ExercisePlan, UserProfile } from "./types";
import { callJSON, isOpenAIAvailable, getDefaultSeasoningModel } from "./openaiClient";

// ============================================================================
// Seasoning Output Type
// ============================================================================

interface SeasoningResult {
  exercises: ExercisePlan[];
  notes: string;
}

interface SeasonedExercise {
  name: string; // may include " - cue: ..." suffix
  // All other fields remain unchanged
}

// ============================================================================
// Main Seasoning Function
// ============================================================================

/**
 * Season exercises with AI:
 * - Swap names if equipment/dislikes require it
 * - Add coaching cues (≤70 chars)
 * - Never change sets, reps, rest_sec, rir, load_kg, order_index
 */
export async function seasonExercises(
  focus: string,
  tags: string[],
  profile: UserProfile,
  candidates: ExercisePlan[],
  opts?: { model?: string }
): Promise<SeasoningResult> {
  // If no OpenAI, return unchanged
  if (!isOpenAIAvailable()) {
    return {
      exercises: candidates,
      notes: "",
    };
  }

  // If no exercises, return early
  if (candidates.length === 0) {
    return {
      exercises: [],
      notes: "",
    };
  }

  const model = opts?.model || getDefaultSeasoningModel();

  try {
    const systemPrompt = buildSeasoningSystemPrompt();
    const userPrompt = buildSeasoningUserPrompt(focus, tags, profile, candidates);

    const result = await callJSON<{
      exercises: SeasonedExercise[];
      notes: string;
    }>(
      model,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "{ exercises: [...], notes: string }",
      {
        temperature: 0.6,
        maxTokens: 1000,
        retries: 1, // fewer retries for optional feature
      }
    );

    // Merge seasoned names back into original exercises
    const seasonedExercises = candidates.map((exercise, index) => {
      const seasoned = result.exercises[index];
      if (!seasoned) return exercise;

      return {
        ...exercise, // keep all numeric fields
        name: seasoned.name, // only update name (may include cue)
      };
    });

    return {
      exercises: seasonedExercises,
      notes: result.notes || "",
    };
  } catch (error) {
    console.warn("AI seasoning failed, using original exercises:", error);
    return {
      exercises: candidates,
      notes: "",
    };
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildSeasoningSystemPrompt(): string {
  return `You are a fitness coach adding final touches to a workout.

**Your task:**
1. Review each exercise name
2. If equipment/dislikes are a problem, suggest ONE alternative name that matches the same movement pattern
3. Add a short coaching cue after the name: " - cue: [cue text]" (≤70 chars)
4. Keep cues actionable and specific (e.g., "chest up", "drive through heels", "control the descent")

**CRITICAL RULES:**
- NEVER change sets, reps, rest_sec, rir, load_kg, order_index (you don't see these fields)
- Only return the exercise name (optionally with " - cue: [text]")
- Keep it concise and practical
- If the original exercise is fine, just add a cue

**Output:**
JSON only:
{
  "exercises": [
    { "name": "Exercise Name - cue: short cue" }
  ],
  "notes": "brief session notes (≤200 chars)"
}`;
}

function buildSeasoningUserPrompt(
  focus: string,
  tags: string[],
  profile: UserProfile,
  candidates: ExercisePlan[]
): string {
  const context = {
    focus,
    tags,
    accessible_equipment: profile.accessible_equipment || "full gym",
    dislikes: profile.dislikes || "none",
    goal: profile.goal || "general fitness",
  };

  const exerciseList = candidates.map((ex, i) => ({
    index: i,
    name: ex.name,
  }));

  return `Add coaching cues and adjust exercise names if needed.

Session context:
${JSON.stringify(context, null, 2)}

Exercises:
${JSON.stringify(exerciseList, null, 2)}

Return JSON:
{
  "exercises": [
    { "name": "Exercise Name - cue: short cue" }
  ],
  "notes": "session notes (≤200 chars)"
}`;
}

// ============================================================================
// Utility: Strip Cues
// ============================================================================

/**
 * Extract base exercise name (without cue)
 */
export function stripCue(exerciseName: string): string {
  const cueIndex = exerciseName.indexOf(" - cue:");
  if (cueIndex === -1) return exerciseName;
  return exerciseName.substring(0, cueIndex).trim();
}

/**
 * Extract cue from exercise name
 */
export function extractCue(exerciseName: string): string | null {
  const cueIndex = exerciseName.indexOf(" - cue:");
  if (cueIndex === -1) return null;
  return exerciseName.substring(cueIndex + 7).trim();
}

