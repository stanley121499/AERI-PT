/**
 * AI Planner Demo Component
 * 
 * Demonstrates the AI planning layer with comprehensive logging.
 * You can add this to your router to test the planner.
 */

import React, { useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useUserInfoContext } from "../contexts/UserInfoContext";
import { supabase } from "../lib/supabase";
import {
  planAndCompile,
  userInfoToProfile,
  getPlanSummary,
  estimateDayDuration,
  isOpenAIAvailable,
  exercisePlanToDbInsert,
} from "../ai";
import type { CompiledDay } from "../ai";
import { getTodayString } from "../utils/dateUtils";

export function AIPlannerDemo(): React.JSX.Element {
  const { user } = useAuthContext();
  const { userInfo } = useUserInfoContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compiledDays, setCompiledDays] = useState<CompiledDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);

  const addLog = (message: string) => {
    console.log(`[AI Planner] ${message}`);
    setLogs((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`]);
  };

  const handleGeneratePlan = async () => {
    if (!user) {
      setError("No user logged in");
      addLog("❌ No user logged in");
      return;
    }

    addLog(`👤 User logged in: ${user.email} (ID: ${user.id})`);
    addLog(`📋 UserInfo state: ${userInfo ? "✅ Loaded" : "❌ Not loaded"}`);
    
    if (userInfo) {
      addLog(`  - UserInfo ID: ${userInfo.id}`);
      addLog(`  - Goal: ${userInfo.goal || "Not set"}`);
      addLog(`  - Frequency: ${userInfo.expected_frequency_per_week || "Not set"}`);
    }

    if (!userInfo) {
      setError("User info not loaded - check console for details");
      addLog("❌ User info not loaded. Checking database...");
      
      // Try to fetch directly to debug
      try {
        const { data, error } = await supabase
          .from("user_info")
          .select("*")
          .eq("user_id", user.id);
        
        addLog(`  - Query with user_id: ${data ? `Found ${data.length} records` : "No data"}`);
        if (error) addLog(`  - Error: ${error.message}`);
        if (data) addLog(`  - Data: ${JSON.stringify(data)}`);
      } catch (err) {
        addLog(`  - Exception: ${err}`);
      }
      
      return;
    }

    setLoading(true);
    setError(null);
    setLogs([]);
    setCompiledDays(null);

    try {
      addLog("🚀 Starting AI planning process...");
      addLog(`OpenAI Available: ${isOpenAIAvailable() ? "✅ Yes" : "❌ No (using stub planner)"}`);

      // Build context
      addLog("📋 Building planning context...");
      const today = getTodayString();
      const profile = userInfoToProfile(userInfo);

      addLog(`  - Today: ${today}`);
      addLog(`  - Goal: ${profile.goal || "Not set"}`);
      addLog(`  - Frequency: ${profile.frequency_per_week || 3} days/week`);
      addLog(`  - Equipment: ${profile.accessible_equipment || "Not specified"}`);
      addLog(`  - Session length: ${profile.session_length_min || 60} minutes`);

      const context = {
        today,
        horizon_days: 7, // Start with 7 days for faster testing
        profile,
        events: [], // For now, no events (we'll add this later)
        recent_history: [], // For now, no history
      };

      // Generate plan
      addLog("🧠 Generating plan with AI planner brain...");
      const startTime = Date.now();

      const days = await planAndCompile(context, {
        horizonDays: 7,
        aiSeasoning: true,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog(`✅ Plan generated in ${duration}s`);

      // Log results
      addLog(`📊 Generated ${days.length} days`);
      days.forEach((day, index) => {
        const exerciseCount = day.exercises.length;
        const durationMin = estimateDayDuration(day);
        addLog(`  Day ${index + 1} (${day.date}): ${day.action} - ${day.focus} (${exerciseCount} exercises, ~${durationMin}min)`);
      });

      // Get summary
      const summary = getPlanSummary(days);
      addLog("📈 Plan Summary:");
      addLog(`  - Training days: ${summary.trainingDays}`);
      addLog(`  - Recovery days: ${summary.recoveryDays}`);
      addLog(`  - Rest days: ${summary.restDays}`);
      addLog(`  - Total exercises: ${summary.totalExercises}`);
      addLog(`  - Estimated weekly hours: ${summary.estimatedWeeklyHours}`);

      setCompiledDays(days);
      addLog("🎉 AI planning complete!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      addLog(`❌ Error: ${errorMsg}`);
      setError(errorMsg);
      console.error("AI Planner Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!user || !compiledDays) {
      addLog("❌ Cannot save: no user or no plan generated");
      return;
    }

    setSaving(true);
    setSavedCount(0);
    addLog("");
    addLog("💾 Starting database insertion...");
    addLog(`📊 Plan to save: ${compiledDays.length} days`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < compiledDays.length; i++) {
        const day = compiledDays[i];
        addLog("");
        addLog(`📅 Day ${i + 1}/${compiledDays.length}: ${day.date}`);
        addLog(`  - Action: ${day.action}`);
        addLog(`  - Focus: ${day.focus}`);
        addLog(`  - Exercises: ${day.exercises.length}`);

        // Skip rest days (no workout to save)
        if (day.action === "rest") {
          addLog(`  ⏭️ Skipping rest day (no workout needed)`);
          skipCount++;
          continue;
        }

        // Check if workout already exists for this date
        const { data: existing, error: checkError } = await supabase
          .from("workouts")
          .select("id, date")
          .eq("user_id", user.id)
          .eq("date", day.date)
          .maybeSingle();

        if (checkError) {
          addLog(`  ❌ Error checking existing workout: ${checkError.message}`);
          errorCount++;
          continue;
        }

        if (existing) {
          addLog(`  ⚠️ Workout already exists for ${day.date} (ID: ${existing.id})`);
          addLog(`  ⏭️ Skipping to avoid duplicates`);
          skipCount++;
          continue;
        }

        // Create workout record
        addLog(`  💾 Creating workout...`);
        const { data: workout, error: workoutError } = await supabase
          .from("workouts")
          .insert({
            user_id: user.id,
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
          addLog(`  ❌ Failed to create workout: ${workoutError?.message}`);
          errorCount++;
          continue;
        }

        addLog(`  ✅ Workout created (ID: ${workout.id})`);

        // Insert exercises
        if (day.exercises.length > 0) {
          addLog(`  💾 Inserting ${day.exercises.length} exercises...`);

          const exerciseInserts = day.exercises.map((ex) =>
            exercisePlanToDbInsert(ex, workout.id)
          );

          const { error: exerciseError } = await supabase
            .from("exercise")
            .insert(exerciseInserts);

          if (exerciseError) {
            addLog(`  ❌ Failed to insert exercises: ${exerciseError.message}`);
            errorCount++;
            continue;
          }

          addLog(`  ✅ ${day.exercises.length} exercises inserted`);
        }

        successCount++;
        setSavedCount(successCount);
        addLog(`  ✅ Day ${i + 1} saved successfully!`);
      }

      // Final summary
      addLog("");
      addLog("📊 Database insertion complete!");
      addLog(`  ✅ Successfully saved: ${successCount} workouts`);
      addLog(`  ⏭️ Skipped: ${skipCount} (rest days or duplicates)`);
      if (errorCount > 0) {
        addLog(`  ❌ Errors: ${errorCount}`);
      }
      addLog("");
      addLog("🎉 Plan saved to database!");

      if (successCount > 0) {
        addLog("💡 Tip: Check your Calendar or Dashboard to see the workouts!");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      addLog(`❌ Database error: ${errorMsg}`);
      setError(errorMsg);
      console.error("Database Save Error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 AI Planner Demo
          </h1>
          <p className="text-gray-600">
            Test the AI planning layer with comprehensive logging.
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800">⚠️ Please log in to use the AI planner.</p>
            </div>
          )}
          {user && !userInfo && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800">⚠️ User info not loaded. Please complete your profile.</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={handleGeneratePlan}
              disabled={loading || !user || !userInfo}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                loading || !user || !userInfo
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "⏳ Generating Plan..." : "🚀 Generate 7-Day Plan"}
            </button>

            {compiledDays && (
              <button
                onClick={handleSaveToDatabase}
                disabled={saving || !user}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                  saving || !user
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {saving ? "💾 Saving..." : savedCount > 0 ? `✅ Saved ${savedCount} workouts` : "💾 Save to Database"}
              </button>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>OpenAI Status:</strong>{" "}
              {isOpenAIAvailable() ? (
                <span className="text-green-600">✅ Connected (AI-powered planning)</span>
              ) : (
                <span className="text-yellow-600">
                  ⚠️ Not configured (using deterministic fallback)
                </span>
              )}
            </p>
            {!isOpenAIAvailable() && (
              <p className="mt-2 text-xs">
                To enable AI features, add <code className="bg-gray-100 px-1 rounded">REACT_APP_OPENAI_API_KEY</code> to your <code className="bg-gray-100 px-1 rounded">.env</code> file.
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">📜 Console Logs</h2>
          <div className="bg-black rounded p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click "Generate Plan" to start.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Results */}
        {compiledDays && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Generated Plan</h2>
            <div className="space-y-4">
              {compiledDays.map((day, index) => (
                <div
                  key={day.date}
                  className={`border rounded-lg p-4 ${
                    day.action === "train"
                      ? "border-blue-300 bg-blue-50"
                      : day.action === "recovery"
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">
                        Day {index + 1} - {day.date}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Action: <span className="font-semibold capitalize">{day.action}</span> |
                        Focus: <span className="font-semibold capitalize">{day.focus}</span> |
                        Tags: {day.tags.join(", ") || "None"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>{day.exercises.length} exercises</p>
                      <p>~{estimateDayDuration(day)} min</p>
                    </div>
                  </div>

                  {day.exercises.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {day.exercises.map((exercise, exIndex) => (
                        <div
                          key={exIndex}
                          className="bg-white rounded p-3 text-sm border border-gray-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {exIndex + 1}. {exercise.name}
                              </p>
                              <p className="text-gray-600 text-xs mt-1">
                                {exercise.sets && exercise.reps && (
                                  <>
                                    {exercise.sets} sets × {exercise.reps} reps
                                  </>
                                )}
                                {exercise.rest_sec && (
                                  <> | Rest: {exercise.rest_sec}s</>
                                )}
                                {exercise.rir && (
                                  <> | RIR: {exercise.rir}</>
                                )}
                              </p>
                            </div>
                            {exercise.estimated_duration && (
                              <div className="text-xs text-gray-500 ml-4">
                                ~{Math.round(exercise.estimated_duration / 60)}min
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {day.meta && Object.keys(day.meta).length > 0 && (
                    <div className="mt-3 text-xs text-gray-600 italic">
                      {JSON.stringify(day.meta)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

