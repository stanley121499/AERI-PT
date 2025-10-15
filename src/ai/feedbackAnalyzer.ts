/**
 * AI Feedback Analyzer - Stage 1 of Multi-Stage AI Pipeline
 * 
 * Analyzes workout feedback and RIR values to understand what went well,
 * what was too hard/easy, and provides structured recommendations.
 */

import { callJSON, getDefaultPlannerModel, isOpenAIAvailable } from "./openaiClient";
import { Workout } from "../contexts/WorkoutContext";
import { Exercise } from "../contexts/ExerciseContext";

// ============================================================================
// Types
// ============================================================================

export interface FeedbackAnalysis {
  overall_difficulty: "too_easy" | "appropriate" | "too_hard";
  exercises_to_increase: string[];  // Exercise names that were too easy
  exercises_to_decrease: string[];  // Exercise names that were too hard
  exercises_to_swap: string[];      // Exercise names that need replacement
  volume_adjustment: number;        // -10 to +10 percent
  intensity_modifier: number;       // 0.9 to 1.1
  notes: string;
  confidence: number;               // 0-1, how confident the analysis is
}

export interface WorkoutFeedbackData {
  workout: Workout;
  exercises: Exercise[];
  user_feedback: string;
  rir_values: Record<string, number>; // exercise_id -> RIR value
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Analyze workout feedback and RIR values to understand performance
 */
export async function analyzeWorkoutFeedback(
  feedbackData: WorkoutFeedbackData[]
): Promise<FeedbackAnalysis> {
  if (!isOpenAIAvailable()) {
    console.log("[Feedback Analyzer] OpenAI not available, using fallback analysis");
    return generateFallbackAnalysis(feedbackData);
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(feedbackData);

    console.log("[Feedback Analyzer] Analyzing workout feedback...");

    const response = await callJSON<FeedbackAnalysis>(
      getDefaultPlannerModel(),
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "{ overall_difficulty: string, exercises_to_increase: string[], exercises_to_decrease: string[], exercises_to_swap: string[], volume_adjustment: number, intensity_modifier: number, notes: string, confidence: number }",
      {
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 800,
        retries: 2,
      }
    );

    console.log(`[Feedback Analyzer] Analysis complete: ${response.overall_difficulty} difficulty`);
    return response;
  } catch (error) {
    console.error("[Feedback Analyzer] AI analysis failed:", error);
    console.log("[Feedback Analyzer] Falling back to simple analysis");
    return generateFallbackAnalysis(feedbackData);
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildSystemPrompt(): string {
  return `You are an expert strength & conditioning coach analyzing workout feedback.

**Your Task:**
Analyze workout feedback and RIR (Reps in Reserve) values to understand what went well, what was too hard/easy, and provide structured recommendations for the next workout.

**RIR Interpretation:**
- RIR 0-1: Too hard (reduce weight or volume)
- RIR 2-3: Perfect difficulty (maintain or slight increase)
- RIR 4-5: Too easy (increase weight or volume)
- RIR 6+: Way too easy (significant increase needed)

**Analysis Guidelines:**
1. **Overall Difficulty**: Consider the majority of exercises and user feedback
2. **Exercise-Specific**: Look at individual RIR values and exercise names
3. **Pattern Recognition**: Identify if certain muscle groups or movement patterns are consistently too hard/easy
4. **Volume Assessment**: Consider if total volume was appropriate
5. **Progression Logic**: Recommend appropriate next steps

**Output Requirements:**
- Be specific about which exercises need changes
- Consider user's experience level and goals
- Provide actionable recommendations
- Be conservative with increases (better to progress slowly)
- Consider recovery and injury prevention

**Format:**
Return JSON with structured analysis including:
- overall_difficulty: "too_easy" | "appropriate" | "too_hard"
- exercises_to_increase: Array of exercise names that were too easy
- exercises_to_decrease: Array of exercise names that were too hard  
- exercises_to_swap: Array of exercise names that need replacement
- volume_adjustment: -10 to +10 percent change
- intensity_modifier: 0.9 to 1.1 multiplier
- notes: Brief explanation of recommendations
- confidence: 0-1 confidence in analysis (0.5+ is good)`;
}

function buildUserPrompt(feedbackData: WorkoutFeedbackData[]): string {
  const recentWorkouts = feedbackData.slice(-3); // Last 3 workouts
  
  const workoutSummaries = recentWorkouts.map((data, index) => {
    const { workout, exercises, user_feedback, rir_values } = data;
    
    const exerciseDetails = exercises.map(ex => {
      const rir = rir_values[ex.id];
      return {
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        load_kg: ex.load_kg,
        rir: rir !== undefined ? rir : "not_rated",
        completed: ex.done
      };
    });

    return `Workout ${index + 1} (${workout.date}):
Focus: ${workout.focus || "Unknown"}
User Feedback: "${user_feedback || "No feedback provided"}"
Exercises:
${exerciseDetails.map(ex => 
  `- ${ex.name}: ${ex.sets} sets x ${ex.reps || "time-based"} reps @ ${ex.load_kg || "bodyweight"}kg, RIR: ${ex.rir}, Completed: ${ex.completed}`
).join("\n")}`;
  }).join("\n\n");

  return `Analyze these recent workouts and provide recommendations for the next workout:

${workoutSummaries}

**Instructions:**
1. Look at RIR values to determine difficulty
2. Consider user feedback for context
3. Identify patterns across workouts
4. Recommend specific changes for next workout
5. Be conservative with increases

Return JSON analysis:`;
}

// ============================================================================
// Fallback Analysis
// ============================================================================

function generateFallbackAnalysis(feedbackData: WorkoutFeedbackData[]): FeedbackAnalysis {
  const latestWorkout = feedbackData[feedbackData.length - 1];
  if (!latestWorkout) {
    return {
      overall_difficulty: "appropriate",
      exercises_to_increase: [],
      exercises_to_decrease: [],
      exercises_to_swap: [],
      volume_adjustment: 0,
      intensity_modifier: 1.0,
      notes: "No workout data available for analysis",
      confidence: 0.1
    };
  }

  const { exercises, rir_values } = latestWorkout;
  
  // Simple analysis based on RIR values
  const exercisesToIncrease: string[] = [];
  const exercisesToDecrease: string[] = [];
  
  exercises.forEach(exercise => {
    const rir = rir_values[exercise.id];
    if (rir !== undefined && exercise.name) {
      if (rir >= 4) {
        exercisesToIncrease.push(exercise.name);
      } else if (rir <= 1) {
        exercisesToDecrease.push(exercise.name);
      }
    }
  });

  const totalExercises = exercises.length;
  const easyExercises = exercisesToIncrease.length;
  const hardExercises = exercisesToDecrease.length;
  
  let overallDifficulty: "too_easy" | "appropriate" | "too_hard" = "appropriate";
  if (easyExercises / totalExercises > 0.6) {
    overallDifficulty = "too_easy";
  } else if (hardExercises / totalExercises > 0.6) {
    overallDifficulty = "too_hard";
  }

  return {
    overall_difficulty: overallDifficulty,
    exercises_to_increase: exercisesToIncrease,
    exercises_to_decrease: exercisesToDecrease,
    exercises_to_swap: [],
    volume_adjustment: overallDifficulty === "too_easy" ? 5 : overallDifficulty === "too_hard" ? -5 : 0,
    intensity_modifier: overallDifficulty === "too_easy" ? 1.05 : overallDifficulty === "too_hard" ? 0.95 : 1.0,
    notes: `Fallback analysis: ${easyExercises} exercises too easy, ${hardExercises} too hard`,
    confidence: 0.3
  };
}
