/**
 * Auto Planner Hook
 * 
 * Automatically generates and saves workout plans when gaps are detected.
 * Runs on app load and periodically checks for missing workouts.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useUserInfoContext } from "../contexts/UserInfoContext";
import { supabase } from "../lib/supabase";
import {
  planAndCompile,
  userInfoToProfile,
  exercisePlanToDbInsert,
  dbEventToUserEvent,
  dbWorkoutToHistoryDay,
} from "../ai";

interface AutoPlannerStatus {
  isChecking: boolean;
  isPlanning: boolean;
  lastCheckTime: Date | null;
  lastPlanTime: Date | null;
  gapsFilled: number;
  error: string | null;
}

interface UseAutoPlannerOptions {
  enabled?: boolean;           // Enable auto-planning (default: true)
  horizonDays?: number;        // How many days ahead to plan (default: 7)
  minGapDays?: number;         // Minimum gap to trigger planning (default: 3)
  checkIntervalMs?: number;    // How often to check (default: 1 hour)
}

export function useAutoPlanner(options: UseAutoPlannerOptions = {}) {
  const {
    enabled = true,
    horizonDays = 7,
    minGapDays = 3,
    checkIntervalMs = 60 * 60 * 1000, // 1 hour
  } = options;

  const { user } = useAuthContext();
  const { userInfo } = useUserInfoContext();

  const [status, setStatus] = useState<AutoPlannerStatus>({
    isChecking: false,
    isPlanning: false,
    lastCheckTime: null,
    lastPlanTime: null,
    gapsFilled: 0,
    error: null,
  });

  const hasRunRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if there are gaps in the schedule
   */
  const checkForGaps = useCallback(async (): Promise<{
    hasGaps: boolean;
    gapDays: number;
    startDate: string;
    endDate: string;
  }> => {
    if (!user) {
      return { hasGaps: false, gapDays: 0, startDate: "", endDate: "" };
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + horizonDays);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    console.log(`[Auto Planner] Checking for gaps from ${todayStr} to ${futureDateStr}`);

    // Get existing workouts in the horizon
    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("date, action")
      .eq("user_id", user.id)
      .gte("date", todayStr)
      .lte("date", futureDateStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("[Auto Planner] Error checking workouts:", error);
      throw error;
    }

    // Count how many training/recovery days we have
    const workoutDates = new Set((workouts || []).map((w) => w.date));
    const totalDays = horizonDays;
    const existingDays = workoutDates.size;
    const gapDays = totalDays - existingDays;

    console.log(`[Auto Planner] Found ${existingDays} existing workouts, ${gapDays} gaps`);

    return {
      hasGaps: gapDays >= minGapDays,
      gapDays,
      startDate: todayStr,
      endDate: futureDateStr,
    };
  }, [user, horizonDays, minGapDays]);

  /**
   * Automatically generate and save a plan to fill gaps
   */
  const autoGeneratePlan = useCallback(async () => {
    if (!user || !userInfo) {
      console.log("[Auto Planner] Skipping: no user or userInfo");
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, isPlanning: true, error: null }));

      console.log("[Auto Planner] Starting automatic plan generation...");

      // Build planning context
      const today = new Date().toISOString().split("T")[0];
      const profile = userInfoToProfile(userInfo);

      // Fetch events
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + horizonDays);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const { data: events } = await supabase
        .from("user_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", today)
        .lte("date", futureDateStr)
        .order("date", { ascending: true });

      // Fetch recent history
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const pastDateStr = pastDate.toISOString().split("T")[0];

      const { data: recentWorkouts } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", pastDateStr)
        .lt("date", today)
        .order("date", { ascending: false });

      const context = {
        today,
        horizon_days: horizonDays,
        profile,
        events: (events || []).map(dbEventToUserEvent),
        recent_history: (recentWorkouts || []).map(dbWorkoutToHistoryDay),
      };

      console.log("[Auto Planner] Generating plan with AI...");

      // Generate plan (disable seasoning for speed)
      const compiledDays = await planAndCompile(context, {
        horizonDays,
        aiSeasoning: false, // Faster without seasoning
      });

      console.log(`[Auto Planner] Generated ${compiledDays.length} days`);

      // Save to database
      let savedCount = 0;

      for (const day of compiledDays) {
        // Skip rest days
        if (day.action === "rest") {
          continue;
        }

        // Check if workout already exists
        const { data: existing } = await supabase
          .from("workouts")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", day.date)
          .maybeSingle();

        if (existing) {
          console.log(`[Auto Planner] Skipping ${day.date} - already exists`);
          continue;
        }

        // Create workout
        const { data: workout, error: workoutError } = await supabase
          .from("workouts")
          .insert({
            user_id: user.id,
            date: day.date,
            action: day.action,
            focus: day.focus,
            tags: day.tags,
            state: "planned",
            plan_meta: { ...day.meta, auto_generated: true },
          })
          .select()
          .single();

        if (workoutError || !workout) {
          console.error(`[Auto Planner] Failed to create workout for ${day.date}:`, workoutError);
          continue;
        }

        // Insert exercises
        if (day.exercises.length > 0) {
          const exerciseInserts = day.exercises.map((ex) =>
            exercisePlanToDbInsert(ex, workout.id)
          );

          const { error: exerciseError } = await supabase
            .from("exercise")
            .insert(exerciseInserts);

          if (exerciseError) {
            console.error(`[Auto Planner] Failed to insert exercises for ${day.date}:`, exerciseError);
            continue;
          }
        }

        savedCount++;
        console.log(`[Auto Planner] Saved workout for ${day.date}`);
      }

      console.log(`[Auto Planner] ✅ Auto-generated and saved ${savedCount} workouts`);

      setStatus((prev) => ({
        ...prev,
        lastPlanTime: new Date(),
        gapsFilled: savedCount,
        error: null,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Auto Planner] Error:", errorMsg);
      setStatus((prev) => ({ ...prev, error: errorMsg }));
    } finally {
      setStatus((prev) => ({ ...prev, isPlanning: false }));
    }
  }, [user, userInfo, horizonDays]);

  /**
   * Check for gaps and auto-generate if needed
   */
  const checkAndPlan = useCallback(async () => {
    if (!enabled || !user || !userInfo) {
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, isChecking: true, error: null }));

      const gapInfo = await checkForGaps();

      setStatus((prev) => ({ ...prev, lastCheckTime: new Date() }));

      if (gapInfo.hasGaps) {
        console.log(`[Auto Planner] Detected ${gapInfo.gapDays} gap days - triggering auto-planning`);
        await autoGeneratePlan();
      } else {
        console.log("[Auto Planner] No gaps detected - schedule looks good!");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Auto Planner] Check failed:", errorMsg);
      setStatus((prev) => ({ ...prev, error: errorMsg }));
    } finally {
      setStatus((prev) => ({ ...prev, isChecking: false }));
    }
  }, [enabled, user, userInfo, checkForGaps, autoGeneratePlan]);

  /**
   * Run on mount and set up periodic checks
   */
  useEffect(() => {
    if (!enabled || !user || !userInfo) {
      return;
    }

    // Run immediately on first load (only once per session)
    if (!hasRunRef.current) {
      console.log("[Auto Planner] Running initial check...");
      hasRunRef.current = true;
      checkAndPlan();
    }

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      console.log("[Auto Planner] Running periodic check...");
      checkAndPlan();
    }, checkIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, user, userInfo, checkAndPlan, checkIntervalMs]);

  return {
    status,
    checkAndPlan, // Manual trigger
  };
}

