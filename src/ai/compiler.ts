/**
 * AI Planning Layer - Exercise Compiler
 * 
 * Deterministic compiler that converts planner tags into concrete exercises.
 * No AI calls here - just template-based exercise generation.
 * 
 * Features:
 * - Safe exercise templates for all focus types
 * - Equipment and dislike filtering
 * - Tag-to-focus mapping
 * - Progressive load/rep schemes
 */

import { ExercisePlan, UserProfile } from "./types";
import { mapToSafeFocus } from "./policy";

// ============================================================================
// Exercise Templates
// ============================================================================

interface ExerciseTemplate {
  name: string;
  sets: number;
  reps: number | string; // can be "8-12" or "30s"
  rest_sec: number;
  rir: number;
  load_kg?: number | null;
  estimated_duration: number; // seconds
  equipment?: string[]; // required equipment
  alternatives?: string[]; // alternative names
}

// Upper body templates
const UPPER_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Dumbbell Bench Press",
    sets: 4,
    reps: 8,
    rest_sec: 180,
    rir: 2,
    load_kg: 20,
    estimated_duration: 900,
    equipment: ["dumbbells"],
    alternatives: ["Push-ups", "Floor Press"],
  },
  {
    name: "Dumbbell Row",
    sets: 4,
    reps: 8,
    rest_sec: 150,
    rir: 2,
    load_kg: 22,
    estimated_duration: 780,
    equipment: ["dumbbells"],
    alternatives: ["Inverted Row"],
  },
  {
    name: "Dumbbell Shoulder Press",
    sets: 3,
    reps: 10,
    rest_sec: 120,
    rir: 2,
    load_kg: 15,
    estimated_duration: 600,
    equipment: ["dumbbells"],
    alternatives: ["Pike Push-ups"],
  },
  {
    name: "Dumbbell Lateral Raise",
    sets: 3,
    reps: 12,
    rest_sec: 90,
    rir: 2,
    load_kg: 8,
    estimated_duration: 450,
    equipment: ["dumbbells"],
    alternatives: ["Side Plank Raises"],
  },
];

// Lower body templates
const LOWER_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Dumbbell Goblet Squat",
    sets: 4,
    reps: 10,
    rest_sec: 180,
    rir: 2,
    load_kg: 20,
    estimated_duration: 960,
    equipment: ["dumbbells"],
    alternatives: ["Bodyweight Squat"],
  },
  {
    name: "Dumbbell Romanian Deadlift",
    sets: 3,
    reps: 10,
    rest_sec: 150,
    rir: 2,
    load_kg: 25,
    estimated_duration: 720,
    equipment: ["dumbbells"],
    alternatives: ["Single-leg RDL"],
  },
  {
    name: "Dumbbell Bulgarian Split Squat",
    sets: 3,
    reps: 10,
    rest_sec: 90,
    rir: 2,
    load_kg: 15,
    estimated_duration: 630,
    equipment: ["dumbbells"],
    alternatives: ["Bodyweight Lunges", "Step-ups"],
  },
  {
    name: "Dumbbell Calf Raise",
    sets: 3,
    reps: 15,
    rest_sec: 60,
    rir: 2,
    load_kg: 20,
    estimated_duration: 450,
    equipment: ["dumbbells"],
    alternatives: ["Bodyweight Calf Raises"],
  },
];

// Full body templates
const FULL_BODY_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Dumbbell Goblet Squat",
    sets: 3,
    reps: 12,
    rest_sec: 90,
    rir: 2,
    load_kg: 16,
    estimated_duration: 540,
    equipment: ["dumbbells"],
    alternatives: ["Bodyweight Squat"],
  },
  {
    name: "Push-ups",
    sets: 3,
    reps: 15,
    rest_sec: 60,
    rir: 2,
    estimated_duration: 360,
    equipment: [],
    alternatives: ["Incline Push-ups", "Knee Push-ups"],
  },
  {
    name: "Dumbbell Row",
    sets: 3,
    reps: 12,
    rest_sec: 90,
    rir: 2,
    load_kg: 18,
    estimated_duration: 540,
    equipment: ["dumbbells"],
    alternatives: ["Bodyweight Row"],
  },
  {
    name: "Dumbbell Overhead Press",
    sets: 3,
    reps: 10,
    rest_sec: 90,
    rir: 2,
    load_kg: 12,
    estimated_duration: 450,
    equipment: ["dumbbells"],
    alternatives: ["Pike Push-ups"],
  },
  {
    name: "Plank - Hold strong core position",
    sets: 3,
    reps: "45s hold",
    rest_sec: 60,
    rir: 1,
    estimated_duration: 315,
    equipment: [],
  },
];

// Conditioning templates
const CONDITIONING_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Burpees",
    sets: 4,
    reps: 10,
    rest_sec: 60,
    rir: 3,
    estimated_duration: 480,
    equipment: [],
  },
  {
    name: "Dumbbell Thrusters",
    sets: 4,
    reps: 12,
    rest_sec: 90,
    rir: 3,
    load_kg: 10,
    estimated_duration: 600,
    equipment: ["dumbbells"],
    alternatives: ["Bodyweight Squats"],
  },
  {
    name: "Mountain Climbers",
    sets: 4,
    reps: 20,
    rest_sec: 60,
    rir: 3,
    estimated_duration: 400,
    equipment: [],
  },
  {
    name: "Dumbbell Swings",
    sets: 4,
    reps: 15,
    rest_sec: 90,
    rir: 2,
    load_kg: 12,
    estimated_duration: 600,
    equipment: ["dumbbells"],
    alternatives: ["Jumping Jacks"],
  },
];

// Recovery/Mobility templates
const MOBILITY_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Cat-Cow Stretch - Flow through spine movements",
    sets: 3,
    reps: "45s flow",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 225,
    equipment: [],
  },
  {
    name: "Downward Dog - Focus on lengthening spine",
    sets: 3,
    reps: "30s hold",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 180,
    equipment: [],
  },
  {
    name: "Standing Forward Fold - Hinge from hips",
    sets: 2,
    reps: "45s hold",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 150,
    equipment: [],
  },
  {
    name: "Lizard Lunge - Open hips gradually",
    sets: 2,
    reps: "30s hold per side",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 210,
    equipment: [],
  },
  {
    name: "Seated Forward Bend - Keep spine long",
    sets: 2,
    reps: "60s hold",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 180,
    equipment: [],
  },
  {
    name: "Child's Pose - Relax and breathe deeply",
    sets: 1,
    reps: "90s hold",
    rest_sec: 0,
    rir: 0,
    estimated_duration: 90,
    equipment: [],
  },
];

// Yoga/Pilates templates
const YOGA_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Sun Salutations",
    sets: 3,
    reps: "5 rounds",
    rest_sec: 60,
    rir: 0,
    estimated_duration: 600,
    equipment: [],
  },
  {
    name: "Downward Dog Hold",
    sets: 3,
    reps: "45s",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 225,
    equipment: [],
  },
  {
    name: "Pigeon Pose",
    sets: 2,
    reps: "60s each side",
    rest_sec: 30,
    rir: 0,
    estimated_duration: 300,
    equipment: [],
  },
];

// Calisthenics templates
const CALISTHENICS_TEMPLATES: ExerciseTemplate[] = [
  {
    name: "Push-ups",
    sets: 4,
    reps: 12,
    rest_sec: 90,
    rir: 2,
    estimated_duration: 480,
    equipment: [],
    alternatives: ["Incline Push-ups", "Knee Push-ups"],
  },
  {
    name: "Pike Push-ups",
    sets: 3,
    reps: 10,
    rest_sec: 90,
    rir: 2,
    estimated_duration: 420,
    equipment: [],
    alternatives: ["Wall Push-ups"],
  },
  {
    name: "Pistol Squats",
    sets: 3,
    reps: 8,
    rest_sec: 90,
    rir: 2,
    estimated_duration: 450,
    equipment: [],
    alternatives: ["Assisted Pistol Squats", "Split Squats"],
  },
  {
    name: "Plank to Push-up",
    sets: 3,
    reps: 10,
    rest_sec: 60,
    rir: 2,
    estimated_duration: 360,
    equipment: [],
  },
];

// ============================================================================
// Focus-to-Template Mapping (LEGACY - kept for backwards compatibility)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FOCUS_TEMPLATE_MAP: Record<string, ExerciseTemplate[]> = {
  upper: UPPER_TEMPLATES,
  lower: LOWER_TEMPLATES,
  full: FULL_BODY_TEMPLATES,
  conditioning: CONDITIONING_TEMPLATES,
  mobility: MOBILITY_TEMPLATES,
  yoga: YOGA_TEMPLATES,
  pilates: YOGA_TEMPLATES, // reuse yoga templates
  calisthenics: CALISTHENICS_TEMPLATES,
  push: UPPER_TEMPLATES.filter((t) => t.name.includes("Press") || t.name.includes("Push")),
  pull: UPPER_TEMPLATES.filter((t) => t.name.includes("Row") || t.name.includes("Pull")),
  legs: LOWER_TEMPLATES,
};

// ============================================================================
// Compiler Functions
// ============================================================================

/**
 * Choose a stable focus string from tags
 */
export function chooseThemeFromTags(tags: string[]): string {
  return mapToSafeFocus(tags);
}

/**
 * Parse user's equipment from their profile
 */
function parseUserEquipment(equipmentStr: string | null | undefined): Set<string> {
  if (!equipmentStr) return new Set(["bodyweight"]);
  
  const str = equipmentStr.toLowerCase();
  const equipment = new Set<string>();
  
  // Always allow bodyweight
  equipment.add("bodyweight");
  
  // Check for specific equipment
  if (str.includes("dumbbell")) equipment.add("dumbbells");
  if (str.includes("kettlebell")) equipment.add("kettlebell");
  if (str.includes("barbell")) equipment.add("barbell");
  if (str.includes("pull-up bar") || str.includes("pullup bar")) equipment.add("pull-up bar");
  if (str.includes("dip bar")) equipment.add("dip bars");
  if (str.includes("bench")) equipment.add("bench");
  if (str.includes("rack")) equipment.add("squat rack");
  if (str.includes("mat") || str.includes("yoga")) equipment.add("mat");
  if (str.includes("resistance band") || str.includes("band")) equipment.add("bands");
  if (str.includes("cable")) equipment.add("cable");
  if (str.includes("machine")) equipment.add("machines");
  
  // If they mention "full gym" or "gym", assume everything
  if (str.includes("full gym") || str === "gym") {
    return new Set(["dumbbells", "barbell", "pull-up bar", "dip bars", "bench", "squat rack", "mat", "bands", "cable", "machines", "bodyweight"]);
  }
  
  return equipment;
}

/**
 * Check if user has all required equipment for an exercise
 */
function hasRequiredEquipment(
  exerciseEquipment: string[] | undefined,
  userEquipment: Set<string>
): boolean {
  // No equipment required = always allowed
  if (!exerciseEquipment || exerciseEquipment.length === 0) {
    return true;
  }
  
  // Check if user has ALL required equipment
  return exerciseEquipment.every((required) => {
    const req = required.toLowerCase();
    // Check exact match or variations
    if (userEquipment.has(req)) return true;
    if (req === "dumbbells" && userEquipment.has("dumbbell")) return true;
    if (req === "dumbbell" && userEquipment.has("dumbbells")) return true;
    return false;
  });
}

/**
 * Filter exercises based on equipment and dislikes
 * (LEGACY - kept for backwards compatibility)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function filterExercises(
  templates: ExerciseTemplate[],
  profile: UserProfile
): ExerciseTemplate[] {
  const userEquipment = parseUserEquipment(profile.accessible_equipment);
  const dislikes = profile.dislikes?.toLowerCase() || "";

  console.log("[Compiler] User equipment:", Array.from(userEquipment).join(", "));

  return templates.filter((template) => {
    // Check dislikes
    if (dislikes && template.name.toLowerCase().includes(dislikes)) {
      console.log(`[Compiler] Filtered out "${template.name}" - matches dislike: ${dislikes}`);
      return false;
    }

    // Check equipment
    if (!hasRequiredEquipment(template.equipment, userEquipment)) {
      console.log(`[Compiler] Filtered out "${template.name}" - missing equipment: ${template.equipment?.join(", ")}`);
      return false;
    }

    return true;
  });
}

/**
 * Get alternative exercise if main is filtered out
 * (LEGACY - kept for backwards compatibility)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getAlternative(
  template: ExerciseTemplate,
  profile: UserProfile
): ExercisePlan | null {
  if (!template.alternatives || template.alternatives.length === 0) {
    return null;
  }

  // Pick first alternative (could be randomized)
  const altName = template.alternatives[0];

  return {
    name: altName,
    sets: template.sets,
    reps: typeof template.reps === "string" ? null : template.reps,
    rest_sec: template.rest_sec,
    rir: template.rir,
    load_kg: null,
    estimated_duration: template.estimated_duration,
  };
}

/**
 * Convert template to exercise plan
 * (LEGACY - kept for backwards compatibility)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function templateToExercisePlan(
  template: ExerciseTemplate,
  orderIndex: number
): ExercisePlan {
  return {
    name: template.name,
    sets: template.sets,
    reps: typeof template.reps === "string" ? null : template.reps,
    rest_sec: template.rest_sec,
    rir: template.rir,
    load_kg: template.load_kg || null,
    estimated_duration: template.estimated_duration,
    order_index: orderIndex,
  };
}

/**
 * Compile exercises from tags and profile
 * This is now just a simple fallback that will be replaced by AI generation
 * Kept for backwards compatibility when AI is not available
 */
export function compileExercises(params: {
  focus: string;
  tags: string[];
  profile: UserProfile;
}): ExercisePlan[] {
  const { focus } = params;

  console.log("[Compiler] Using simple fallback exercises (AI generator should be used instead)");

  // Very simple fallback based on focus - AI should handle the real generation
  // Keep reps as numbers since ExercisePlan type expects number | null
  const fallbackMap: Record<string, ExercisePlan[]> = {
    upper: [
      { name: "Push-ups", sets: 3, reps: 12, rest_sec: 90, rir: null, estimated_duration: 360, order_index: 0 },
      { name: "Pike Push-ups", sets: 3, reps: 10, rest_sec: 90, rir: null, estimated_duration: 360, order_index: 1 },
      { name: "Plank - Hold for 45 seconds", sets: 3, reps: null, rest_sec: 60, rir: null, estimated_duration: 315, order_index: 2 },
    ],
    lower: [
      { name: "Bodyweight Squats", sets: 3, reps: 15, rest_sec: 90, rir: null, estimated_duration: 450, order_index: 0 },
      { name: "Lunges", sets: 3, reps: 12, rest_sec: 90, rir: null, estimated_duration: 420, order_index: 1 },
      { name: "Glute Bridges", sets: 3, reps: 15, rest_sec: 60, rir: null, estimated_duration: 360, order_index: 2 },
    ],
    conditioning: [
      { name: "Burpees", sets: 4, reps: 10, rest_sec: 60, rir: null, estimated_duration: 400, order_index: 0 },
      { name: "Mountain Climbers", sets: 4, reps: 20, rest_sec: 60, rir: null, estimated_duration: 400, order_index: 1 },
      { name: "Jumping Jacks", sets: 3, reps: 30, rest_sec: 60, rir: null, estimated_duration: 360, order_index: 2 },
    ],
    mobility: [
      { name: "Cat-Cow Stretch - Flow for 45 seconds", sets: 3, reps: null, rest_sec: 30, rir: null, estimated_duration: 225, order_index: 0 },
      { name: "Downward Dog - Hold for 30 seconds", sets: 3, reps: null, rest_sec: 30, rir: null, estimated_duration: 180, order_index: 1 },
      { name: "Child's Pose - Hold for 90 seconds", sets: 1, reps: null, rest_sec: 0, rir: null, estimated_duration: 90, order_index: 2 },
    ],
    yoga: [
      { name: "Sun Salutations - Flow for 60 seconds", sets: 3, reps: null, rest_sec: 60, rir: null, estimated_duration: 540, order_index: 0 },
      { name: "Warrior II - Hold 45 seconds per side", sets: 2, reps: null, rest_sec: 30, rir: null, estimated_duration: 210, order_index: 1 },
      { name: "Savasana - Relax for 5 minutes", sets: 1, reps: null, rest_sec: 0, rir: null, estimated_duration: 300, order_index: 2 },
    ],
  };

  return fallbackMap[focus] || fallbackMap.upper;
}

/**
 * Helper: Check if focus is recovery-type
 */
export function isRecoveryFocus(focus: string): boolean {
  return ["mobility", "yoga", "pilates", "stretch"].includes(focus.toLowerCase());
}

/**
 * Helper: Estimate total session duration
 */
export function estimateTotalDuration(exercises: ExercisePlan[]): number {
  return exercises.reduce((total, ex) => total + (ex.estimated_duration || 0), 0);
}

