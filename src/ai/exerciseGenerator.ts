/**
 * AI Exercise Generator
 * 
 * Uses OpenAI to dynamically generate exercises based on focus and context.
 * No templates - fully AI-driven exercise selection and programming.
 */

import { ExercisePlan, UserProfile } from "./types";
import { callJSON, isOpenAIAvailable, getDefaultPlannerModel } from "./openaiClient";
import { AdaptationStrategy } from "./adaptationPlanner";

interface ExerciseGenerationContext {
  focus: string;
  tags: string[];
  profile: UserProfile;
  sessionLengthMin?: number;
  adaptationStrategy?: AdaptationStrategy;
  previousWorkout?: {
    exercises: ExercisePlan[];
    feedback: string;
    rir_values: Record<string, number>;
  };
}

interface AIExerciseResponse {
  exercises: Array<{
    name: string;
    sets: number;
    reps: number | string; // Can be "8-12" or "30s"
    rest_sec: number;
    load_kg?: number | null;
    estimated_duration_sec: number;
    notes?: string;
  }>;
  session_notes?: string;
}

/**
 * Generate exercises using AI
 */
export async function generateExercisesWithAI(
  context: ExerciseGenerationContext
): Promise<ExercisePlan[]> {
  if (!isOpenAIAvailable()) {
    console.log("[Exercise Generator] OpenAI not available, using simple fallback");
    return generateFallbackExercises(context);
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(context);

    console.log("[Exercise Generator] Calling OpenAI to generate exercises...");

    const response = await callJSON<AIExerciseResponse>(
      getDefaultPlannerModel(),
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "{ exercises: [...], session_notes: string }",
      {
        temperature: 0.8, // Higher creativity for exercise variety
        maxTokens: 1500,
        retries: 2,
      }
    );

    console.log(`[Exercise Generator] AI generated ${response.exercises.length} exercises`);

    // Convert AI response to ExercisePlan format
    const exercises: ExercisePlan[] = response.exercises.map((ex, index) => ({
      name: ex.name + (ex.notes ? ` - ${ex.notes}` : ""),
      sets: ex.sets,
      reps: typeof ex.reps === "string" ? null : ex.reps,
      rest_sec: ex.rest_sec,
      rir: null, // User fills this during workout
      load_kg: ex.load_kg || null,
      estimated_duration: ex.estimated_duration_sec,
      order_index: index,
    }));

    return exercises;
  } catch (error) {
    console.error("[Exercise Generator] AI generation failed:", error);
    console.log("[Exercise Generator] Falling back to simple generation");
    return generateFallbackExercises(context);
  }
}

function buildSystemPrompt(): string {
  return `You are an expert strength & conditioning coach generating workout exercises.

**Your Task:**
Generate a complete list of exercises for a training session based on the focus and user context.

**Key Principles:**
1. **Equipment**: ONLY use equipment the user has access to
2. **Variety**: Choose diverse exercises that complement each other
3. **Progression**: Order exercises from compound to isolation, heavy to light
4. **Practical**: All exercises must be realistic and safe
5. **Volume**: Appropriate total volume for the session length

**Exercise Selection:**
- Start with main compound movements
- Include accessory work
- Consider muscle balance (push/pull, upper/lower)
- Respect user dislikes
- Use proper exercise names (e.g., "Dumbbell Bench Press" not "DB Press")
- Be creative with exercise selection - don't limit yourself to basic movements
- Include variations, unilateral work, and different movement patterns

**Programming Guidelines:**
- **Strength exercises**: 3-5 sets, 5-8 reps, 120-180s rest, suggest weights
- **Hypertrophy exercises**: 3-4 sets, 8-12 reps, 90-120s rest, suggest weights  
- **Endurance exercises**: 2-4 sets, 12-20 reps, 60-90s rest
- **Time-based exercises**: Be specific about duration and type
- **Mobility/Stretching**: 1-3 sets, 30-90s holds, 30s rest
- **Isometric holds**: 2-4 sets, 15-60s holds, 60-90s rest
- **Flow movements**: 2-3 sets, 30-90s continuous, 30-60s rest

**Time-Based Exercise Instructions:**
For ANY exercise that involves holding a position or continuous movement for time, include the duration in the exercise name:
- **Static holds**: "Plank - Hold for 45 seconds", "Wall Sit - Hold for 60 seconds"
- **Per side**: "Side Plank - Hold 30 seconds per side", "Single Leg Glute Bridge - 20 seconds each side"
- **Flow/continuous**: "Cat-Cow Stretch - Flow for 60 seconds", "Sun Salutations - 45 seconds continuous"
- **Breathing holds**: "Deep Breathing - Hold for 30 seconds with focus"
- **Examples**: 
  - "Plank - Hold for 45 seconds" (sets: 3, reps: null)
  - "Warrior III - Hold 20 seconds per side" (sets: 2, reps: null)
  - "Cat-Cow Stretch - Flow for 60 seconds" (sets: 3, reps: null)
  - "Dead Bug - 30 seconds per side" (sets: 3, reps: null)

For time-based exercises, set reps to null and include all timing information in the exercise name.

**SPECIFICITY REQUIREMENTS:**
- **NEVER use vague descriptions** like "Yoga Mat Stretching - Flow" or "General Mobility"
- **ALWAYS provide specific movements** - assume the user has never done the exercise before
- **For flow exercises**: List 3-5 specific movements, e.g., "Cat-Cow, Child's Pose, Downward Dog, Cobra - Flow through each for 60 seconds"
- **For stretching**: Specify exact positions, e.g., "Hip Flexor Stretch - Lunge position, hold 30 seconds per side"
- **For mobility**: Name specific movements, e.g., "Shoulder Circles - 10 forward, 10 backward, 3 sets"
- **For yoga flows**: List the sequence, e.g., "Sun Salutation A - Mountain Pose to Forward Fold to Plank to Upward Dog to Downward Dog, repeat 5 times"

**Format:**
Return JSON with an array of exercises. Each exercise needs:
- name: Full exercise name with brief instruction if helpful
- sets: Number of sets
- reps: Number of reps (use null for time-based exercises - put timing in name instead)
- rest_sec: Rest period in seconds
- load_kg: Suggested weight in kg (null if bodyweight)
- estimated_duration_sec: Total time for this exercise (sets + reps + rest)
- notes: Optional short coaching cue (≤50 chars)

**Do NOT:**
- Include RIR (user tracks this during workout)
- Use equipment the user doesn't have
- Suggest exercises from the user's dislike list
- Create dangerous or unrealistic exercises
- Limit yourself to basic exercises - be creative!`;
}

function buildUserPrompt(context: ExerciseGenerationContext): string {
  const { focus, tags, profile, sessionLengthMin = 60, adaptationStrategy, previousWorkout } = context;

  const cleanProfile = {
    goal: profile.goal || "general fitness",
    equipment: profile.accessible_equipment || "bodyweight only",
    dislikes: profile.dislikes || "none",
    session_length: sessionLengthMin,
  };

  let prompt = `Generate exercises for this workout:

**Session Details:**
- Focus: ${focus}
- Tags: ${tags.join(", ")}
- Target Duration: ${sessionLengthMin} minutes

**User Profile:**
${JSON.stringify(cleanProfile, null, 2)}`;

  // Add adaptation strategy if available
  if (adaptationStrategy) {
    prompt += `

**Adaptation Strategy (Apply These Changes):**
- Overall Intensity Modifier: ${adaptationStrategy.intensity_modifier}x
- Progression Notes: ${adaptationStrategy.progression_notes}

**Load Adjustments:**
${adaptationStrategy.load_adjustments.map(adj => 
  `- ${adj.exercise_pattern}: ${adj.change_kg > 0 ? '+' : ''}${adj.change_kg}kg (${adj.reason})`
).join('\n')}

**Volume Adjustments:**
${adaptationStrategy.volume_adjustments.map(adj => 
  `- ${adj.exercise_pattern}: ${adj.sets_change > 0 ? '+' : ''}${adj.sets_change} sets${adj.reps_change ? `, ${adj.reps_change > 0 ? '+' : ''}${adj.reps_change} reps` : ''} (${adj.reason})`
).join('\n')}

**Exercise Swaps:**
${adaptationStrategy.exercise_swaps.map(swap => 
  `- Replace "${swap.old_exercise_pattern}" with "${swap.new_exercise}" (${swap.reason})`
).join('\n')}`;
  }

  // Add previous workout context if available
  if (previousWorkout) {
    prompt += `

**Previous Workout Context:**
- Feedback: "${previousWorkout.feedback}"
- RIR Values: ${JSON.stringify(previousWorkout.rir_values, null, 2)}
- Previous Exercises: ${previousWorkout.exercises.map(ex => ex.name).join(", ")}`;
  }

  prompt += `

**Requirements:**
- Generate 4-6 exercises (adjust based on session length)
- Use ONLY equipment from: "${cleanProfile.equipment}"
- Avoid: "${cleanProfile.dislikes}"
- Total session should fit in ~${sessionLengthMin} minutes
${adaptationStrategy ? '- Apply the adaptation strategy above to modify exercises' : ''}

Return JSON:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 4,
      "reps": 8,
      "rest_sec": 180,
      "load_kg": 20,
      "estimated_duration_sec": 720,
      "notes": "Short cue"
    }
  ],
  "session_notes": "Brief session overview"
}`;

  return prompt;
}

/**
 * Simple fallback when AI is not available
 */
function generateFallbackExercises(context: ExerciseGenerationContext): ExercisePlan[] {
  const { focus } = context;
  
  // Very simple fallback based on focus
  const fallbackMap: Record<string, ExercisePlan[]> = {
    upper: [
      { name: "Push-ups", sets: 3, reps: 12, rest_sec: 90, rir: null, estimated_duration: 360, order_index: 0 },
      { name: "Dumbbell Row", sets: 3, reps: 10, rest_sec: 90, rir: null, load_kg: 15, estimated_duration: 360, order_index: 1 },
      { name: "Pike Push-ups", sets: 3, reps: 10, rest_sec: 90, rir: null, estimated_duration: 360, order_index: 2 },
      { name: "Plank", sets: 3, reps: null, rest_sec: 60, rir: null, estimated_duration: 240, order_index: 3 },
    ],
    lower: [
      { name: "Bodyweight Squats", sets: 3, reps: 15, rest_sec: 90, rir: null, estimated_duration: 450, order_index: 0 },
      { name: "Lunges", sets: 3, reps: 12, rest_sec: 90, rir: null, estimated_duration: 420, order_index: 1 },
      { name: "Glute Bridges", sets: 3, reps: 15, rest_sec: 60, rir: null, estimated_duration: 360, order_index: 2 },
      { name: "Calf Raises", sets: 3, reps: 20, rest_sec: 60, rir: null, estimated_duration: 360, order_index: 3 },
    ],
    conditioning: [
      { name: "Burpees", sets: 4, reps: 10, rest_sec: 60, rir: null, estimated_duration: 400, order_index: 0 },
      { name: "Mountain Climbers", sets: 4, reps: 20, rest_sec: 60, rir: null, estimated_duration: 400, order_index: 1 },
      { name: "Jumping Jacks", sets: 3, reps: 30, rest_sec: 60, rir: null, estimated_duration: 360, order_index: 2 },
    ],
    mobility: [
      { name: "Cat-Cow Stretch", sets: 3, reps: null, rest_sec: 30, rir: null, estimated_duration: 180, order_index: 0 },
      { name: "Hip Flexor Stretch", sets: 2, reps: null, rest_sec: 30, rir: null, estimated_duration: 150, order_index: 1 },
      { name: "Shoulder Circles", sets: 2, reps: null, rest_sec: 0, rir: null, estimated_duration: 60, order_index: 2 },
      { name: "Spinal Twists", sets: 2, reps: null, rest_sec: 30, rir: null, estimated_duration: 120, order_index: 3 },
    ],
  };

  return fallbackMap[focus] || fallbackMap.upper;
}

