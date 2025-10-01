/**
 * AI Planning Layer - Example Usage
 * 
 * This file demonstrates how to use the AI planning layer in your application.
 * Copy and adapt these examples to your needs.
 */

import {
  planAndCompile,
  userInfoToProfile,
  dbEventToUserEvent,
  dbWorkoutToHistoryDay,
  getPlanSummary,
  estimateDayDuration,
  exercisePlanToDbInsert,
} from "./index";
import type { PlanningContext, CompiledDay } from "./index";
import { supabase } from "../lib/supabase";

// ============================================================================
// Example 1: Basic Planning (7 days)
// ============================================================================

export async function example1_basicPlanning() {
  console.log("=== Example 1: Basic Planning ===");

  const context: PlanningContext = {
    today: new Date().toISOString().split("T")[0], // Today's date
    horizon_days: 7,
    profile: {
      goal: "strength and hypertrophy",
      frequency_per_week: 4,
      accessible_equipment: "full gym",
      dislikes: "burpees",
      session_length_min: 60,
    },
    events: [],
    recent_history: [],
  };

  const compiledDays = await planAndCompile(context, {
    horizonDays: 7,
    aiSeasoning: true,
  });

  // Display results
  console.log(`Generated ${compiledDays.length} days`);
  for (const day of compiledDays) {
    console.log(
      `${day.date}: ${day.action} - ${day.focus} (${day.exercises.length} exercises)`
    );
  }

  // Get summary
  const summary = getPlanSummary(compiledDays);
  console.log("Summary:", summary);

  return compiledDays;
}

// ============================================================================
// Example 2: Planning with Events
// ============================================================================

export async function example2_planningWithEvents() {
  console.log("=== Example 2: Planning with Events ===");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Add a "Park Run" event in 3 days
  const eventDate = new Date(today);
  eventDate.setDate(today.getDate() + 3);
  const eventDateStr = eventDate.toISOString().split("T")[0];

  const context: PlanningContext = {
    today: todayStr,
    horizon_days: 7,
    profile: {
      goal: "general fitness",
      frequency_per_week: 3,
      accessible_equipment: "full gym",
      session_length_min: 45,
    },
    events: [
      {
        date: eventDateStr,
        label: "Park Run",
        intensity: "high",
        tags: ["run", "race"],
        notes: "5K time trial",
      },
    ],
    recent_history: [],
  };

  const compiledDays = await planAndCompile(context);

  // Notice: No heavy leg days around the event
  for (const day of compiledDays) {
    console.log(
      `${day.date}: ${day.action} - ${day.focus} (tags: ${day.tags.join(", ")})`
    );
  }

  return compiledDays;
}

// ============================================================================
// Example 3: Bodyweight Only
// ============================================================================

export async function example3_bodyweightOnly() {
  console.log("=== Example 3: Bodyweight Only ===");

  const context: PlanningContext = {
    today: new Date().toISOString().split("T")[0],
    horizon_days: 7,
    profile: {
      goal: "general fitness",
      frequency_per_week: 3,
      accessible_equipment: "bodyweight", // No equipment
      dislikes: null,
      session_length_min: 30,
    },
    events: [],
    recent_history: [],
  };

  const compiledDays = await planAndCompile(context, {
    aiSeasoning: false, // Disable seasoning for faster results
  });

  // All exercises should be bodyweight
  for (const day of compiledDays) {
    if (day.exercises.length > 0) {
      console.log(`${day.date}: ${day.focus}`);
      for (const ex of day.exercises) {
        console.log(`  - ${ex.name}`);
      }
    }
  }

  return compiledDays;
}

// ============================================================================
// Example 4: Full Integration with Database
// ============================================================================

export async function example4_fullIntegration(userId: string) {
  console.log("=== Example 4: Full Database Integration ===");

  try {
    // 1. Fetch user info
    const { data: userInfo, error: userInfoError } = await supabase
      .from("user_info")
      .select("*")
      .eq("user_id", userId) // Note: using "user_id" instead of "uesr_id"
      .single();

    if (userInfoError || !userInfo) {
      throw new Error("User info not found");
    }

    // 2. Fetch upcoming events (next 14 days)
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const { data: events, error: eventsError } = await supabase
      .from("user_events")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today)
      .lte("date", futureDateStr)
      .order("date", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
    }

    // 3. Fetch recent workout history (last 7 days)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const pastDateStr = pastDate.toISOString().split("T")[0];

    const { data: recentWorkouts, error: workoutsError } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("date", pastDateStr)
      .lte("date", today)
      .order("date", { ascending: false });

    if (workoutsError) {
      console.error("Error fetching workouts:", workoutsError);
    }

    // 4. Build planning context
    const context: PlanningContext = {
      today,
      horizon_days: 14,
      profile: userInfoToProfile(userInfo),
      events: (events || []).map(dbEventToUserEvent),
      recent_history: (recentWorkouts || []).map(dbWorkoutToHistoryDay),
    };

    // 5. Generate plan
    console.log("Generating plan...");
    const compiledDays = await planAndCompile(context, {
      horizonDays: 14,
      aiSeasoning: true,
    });

    console.log(`Generated ${compiledDays.length} days`);

    // 6. Insert compiled days into database
    for (const day of compiledDays) {
      await insertCompiledDay(day, userId);
    }

    console.log("Plan inserted successfully!");

    return compiledDays;
  } catch (error) {
    console.error("Full integration failed:", error);
    throw error;
  }
}

// ============================================================================
// Helper: Insert Compiled Day into Database
// ============================================================================

async function insertCompiledDay(day: CompiledDay, userId: string): Promise<void> {
  // Skip rest/event days (or optionally create placeholder workouts)
  if (day.action === "rest") {
    console.log(`Skipping rest day: ${day.date}`);
    return;
  }

  if (day.action === "event") {
    console.log(`Skipping event day: ${day.date}`);
    return;
  }

  // Check if workout already exists for this date
  const { data: existing, error: checkError } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("date", day.date)
    .maybeSingle();

  if (checkError) {
    console.error(`Error checking existing workout for ${day.date}:`, checkError);
    return;
  }

  if (existing) {
    console.log(`Workout already exists for ${day.date}, skipping`);
    return;
  }

  // Create workout record
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      date: day.date,
      action: day.action,
      focus: day.focus,
      tags: day.tags,
      state: "planned",
      plan_meta: day.meta || {},
    })
    .select()
    .single();

  if (workoutError || !workout) {
    console.error(`Failed to create workout for ${day.date}:`, workoutError);
    return;
  }

  console.log(`Created workout for ${day.date}: ${workout.id}`);

  // Insert exercises
  if (day.exercises.length > 0) {
    const exerciseInserts = day.exercises.map((ex) =>
      exercisePlanToDbInsert(ex, workout.id)
    );

    const { error: exerciseError } = await supabase
      .from("exercise")
      .insert(exerciseInserts);

    if (exerciseError) {
      console.error(`Failed to insert exercises for ${day.date}:`, exerciseError);
      return;
    }

    console.log(`  ✓ Inserted ${day.exercises.length} exercises`);
  }
}

// ============================================================================
// Example 5: Get Estimated Duration
// ============================================================================

export function example5_estimateDuration(compiledDays: CompiledDay[]) {
  console.log("=== Example 5: Estimate Duration ===");

  for (const day of compiledDays) {
    if (day.exercises.length > 0) {
      const durationMin = estimateDayDuration(day);
      console.log(`${day.date}: ~${durationMin} minutes (${day.exercises.length} exercises)`);
    }
  }
}

// ============================================================================
// Run Examples (for testing)
// ============================================================================

export async function runExamples() {
  console.log("\n🚀 AI Planning Layer Examples\n");

  try {
    // Example 1
    await example1_basicPlanning();
    console.log("\n");

    // Example 2
    await example2_planningWithEvents();
    console.log("\n");

    // Example 3
    const bodyweightDays = await example3_bodyweightOnly();
    console.log("\n");

    // Example 5
    example5_estimateDuration(bodyweightDays);
    console.log("\n");

    console.log("✅ All examples completed!");
  } catch (error) {
    console.error("❌ Example failed:", error);
  }
}

// Uncomment to run examples:
// runExamples();

