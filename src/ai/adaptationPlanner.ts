/**
 * AI Adaptation Planner - Stage 2 of Multi-Stage AI Pipeline
 * 
 * Takes feedback analysis and creates specific adaptation strategies
 * for progressive overload and workout modifications.
 */

import { callJSON, getDefaultPlannerModel, isOpenAIAvailable } from "./openaiClient";
import { FeedbackAnalysis } from "./feedbackAnalyzer";
import { UserProfile } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface AdaptationStrategy {
  load_adjustments: LoadAdjustment[];
  volume_adjustments: VolumeAdjustment[];
  exercise_swaps: ExerciseSwap[];
  intensity_modifier: number; // 0.9 to 1.1
  progression_notes: string;
  confidence: number; // 0-1
}

export interface LoadAdjustment {
  exercise_pattern: string; // Pattern to match exercise names
  change_kg: number;        // Weight change in kg
  reason: string;           // Why this adjustment
}

export interface VolumeAdjustment {
  exercise_pattern: string; // Pattern to match exercise names
  sets_change: number;      // Change in number of sets
  reps_change?: number;     // Change in reps (optional)
  reason: string;           // Why this adjustment
}

export interface ExerciseSwap {
  old_exercise_pattern: string; // Pattern to match current exercise
  new_exercise: string;         // Replacement exercise name
  reason: string;               // Why this swap
}

export interface AdaptationContext {
  feedback_analysis: FeedbackAnalysis;
  user_profile: UserProfile;
  recent_workouts: number; // Number of recent workouts analyzed
  user_goals: string;
  equipment_available: string;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create adaptation strategy based on feedback analysis
 */
export async function planWorkoutAdaptation(
  context: AdaptationContext
): Promise<AdaptationStrategy> {
  if (!isOpenAIAvailable()) {
    console.log("[Adaptation Planner] OpenAI not available, using fallback strategy");
    return generateFallbackStrategy(context);
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(context);

    console.log("[Adaptation Planner] Creating adaptation strategy...");

    const response = await callJSON<AdaptationStrategy>(
      getDefaultPlannerModel(),
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "{ load_adjustments: [{ exercise_pattern: string, change_kg: number, reason: string }], volume_adjustments: [{ exercise_pattern: string, sets_change: number, reps_change?: number, reason: string }], exercise_swaps: [{ old_exercise_pattern: string, new_exercise: string, reason: string }], intensity_modifier: number, progression_notes: string, confidence: number }",
      {
        temperature: 0.4, // Slightly higher for creative but consistent strategies
        maxTokens: 1000,
        retries: 2,
      }
    );

    console.log(`[Adaptation Planner] Strategy created with ${response.load_adjustments.length} load adjustments`);
    return response;
  } catch (error) {
    console.error("[Adaptation Planner] AI planning failed:", error);
    console.log("[Adaptation Planner] Falling back to simple strategy");
    return generateFallbackStrategy(context);
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildSystemPrompt(): string {
  return `You are an expert strength & conditioning coach creating progressive overload strategies.

**Your Task:**
Create specific adaptation strategies for the next workout based on feedback analysis. Focus on safe, effective progression that matches the user's goals and experience level.

**Progression Principles:**
1. **Conservative Progression**: Better to progress slowly than risk injury
2. **Individual Adaptation**: Consider user's goals, equipment, and experience
3. **Balanced Development**: Don't neglect any muscle groups
4. **Recovery Consideration**: Ensure adequate recovery between sessions
5. **Specificity**: Match adaptations to the specific exercises and patterns

**Load Adjustment Guidelines:**
- **Too Easy (RIR 4+)**: Increase weight by 2.5-5kg for compound movements, 1-2.5kg for isolation
- **Too Hard (RIR 0-1)**: Decrease weight by 2.5-5kg for compound movements, 1-2.5kg for isolation
- **Perfect (RIR 2-3)**: Maintain or slight increase (1-2.5kg)
- **Bodyweight exercises**: Adjust reps or add assistance/resistance

**Volume Adjustment Guidelines:**
- **Too Easy**: Add 1-2 sets or increase reps by 2-5
- **Too Hard**: Reduce by 1 set or decrease reps by 2-5
- **Perfect**: Maintain current volume
- **Consider total weekly volume**: Don't increase too much at once

**Exercise Swap Guidelines:**
- **Too Hard**: Swap to easier variation or different movement pattern
- **Equipment Issues**: Replace with available equipment
- **Boredom/Plateau**: Introduce new movement while maintaining stimulus
- **Injury Risk**: Replace with safer alternative

**Pattern Matching:**
Use flexible patterns to match exercises:
- "squat" matches "Goblet Squat", "Bulgarian Split Squat", etc.
- "press" matches "Bench Press", "Overhead Press", etc.
- "row" matches "Dumbbell Row", "Bent-Over Row", etc.
- "curl" matches "Bicep Curl", "Hammer Curl", etc.

**Output Requirements:**
- Be specific about which exercises to modify
- Provide clear reasoning for each change
- Consider the user's equipment and goals
- Ensure balanced progression across all muscle groups
- Be conservative with increases

**Format:**
Return JSON with structured adaptation strategy.`;
}

function buildUserPrompt(context: AdaptationContext): string {
  const { feedback_analysis, user_profile, user_goals, equipment_available } = context;
  
  return `Create an adaptation strategy for the next workout based on this analysis:

**Feedback Analysis:**
- Overall Difficulty: ${feedback_analysis.overall_difficulty}
- Exercises to Increase: ${feedback_analysis.exercises_to_increase.join(", ") || "None"}
- Exercises to Decrease: ${feedback_analysis.exercises_to_decrease.join(", ") || "None"}
- Exercises to Swap: ${feedback_analysis.exercises_to_swap.join(", ") || "None"}
- Volume Adjustment: ${feedback_analysis.volume_adjustment}%
- Intensity Modifier: ${feedback_analysis.intensity_modifier}
- Notes: ${feedback_analysis.notes}
- Confidence: ${feedback_analysis.confidence}

**User Profile:**
- Goal: ${user_profile.goal || "General fitness"}
- Equipment: ${user_profile.accessible_equipment || "Not specified"}
- Session Length: ${user_profile.session_length_min || 60} minutes
- Dislikes: ${user_profile.dislikes || "None"}

**User Goals:**
${user_goals}

**Available Equipment:**
${equipment_available}

**Instructions:**
1. Create specific load adjustments for exercises that need changes
2. Plan volume adjustments for appropriate exercises
3. Suggest exercise swaps where needed
4. Set overall intensity modifier
5. Provide clear reasoning for each change
6. Ensure all changes are safe and progressive

Return JSON adaptation strategy:`;
}

// ============================================================================
// Fallback Strategy
// ============================================================================

function generateFallbackStrategy(context: AdaptationContext): AdaptationStrategy {
  const { feedback_analysis } = context;
  
  const loadAdjustments: LoadAdjustment[] = [];
  const volumeAdjustments: VolumeAdjustment[] = [];
  const exerciseSwaps: ExerciseSwap[] = [];

  // Simple load adjustments based on feedback
  feedback_analysis.exercises_to_increase.forEach(exerciseName => {
    loadAdjustments.push({
      exercise_pattern: exerciseName.toLowerCase(),
      change_kg: 2.5,
      reason: "Exercise was too easy, increasing weight"
    });
  });

  feedback_analysis.exercises_to_decrease.forEach(exerciseName => {
    loadAdjustments.push({
      exercise_pattern: exerciseName.toLowerCase(),
      change_kg: -2.5,
      reason: "Exercise was too hard, decreasing weight"
    });
  });

  // Simple volume adjustments
  if (feedback_analysis.volume_adjustment > 0) {
    volumeAdjustments.push({
      exercise_pattern: ".*", // Match all exercises
      sets_change: 1,
      reason: "Overall volume was too low, adding sets"
    });
  } else if (feedback_analysis.volume_adjustment < 0) {
    volumeAdjustments.push({
      exercise_pattern: ".*", // Match all exercises
      sets_change: -1,
      reason: "Overall volume was too high, reducing sets"
    });
  }

  return {
    load_adjustments: loadAdjustments,
    volume_adjustments: volumeAdjustments,
    exercise_swaps: exerciseSwaps,
    intensity_modifier: feedback_analysis.intensity_modifier,
    progression_notes: `Fallback strategy based on ${feedback_analysis.overall_difficulty} difficulty`,
    confidence: 0.4
  };
}

