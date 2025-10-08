import React, { useState, useEffect } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useWorkoutContext, Workout } from "../contexts/WorkoutContext";
import { useExerciseContext, Exercise } from "../contexts/ExerciseContext";
import { Sidebar } from "./Sidebar";
import { getTodayString } from "../utils/dateUtils";

/**
 * Workout execution page for active workout sessions
 * Now connected to real database through contexts
 */
interface WorkoutPageProps {
  workoutId?: string;
}

export function WorkoutPage({ workoutId }: WorkoutPageProps): React.JSX.Element {
  const { user } = useAuthContext();
  const { workouts, updateWorkout } = useWorkoutContext();
  const { getExercisesByWorkout, updateExercise } = useExerciseContext();
  
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restTimer, setRestTimer] = useState<number>(0);
  const [workoutStartTime] = useState<Date>(new Date());
  const [showWorkoutComplete, setShowWorkoutComplete] = useState<boolean>(false);
  const [activeWorkoutStarted, setActiveWorkoutStarted] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [workoutFeedback, setWorkoutFeedback] = useState<string>("");
  const [exerciseRirValues, setExerciseRirValues] = useState<Record<string, number>>({});
  const [workoutAdaptations, setWorkoutAdaptations] = useState<string[]>([]);

  // Load specific workout by ID, or today's workout, or most recent workout
  useEffect(() => {
    const loadWorkout = async () => {
      if (!user || workouts.length === 0) {
        setLoading(false);
        return;
      }

      let workout: Workout | undefined;

      // If workoutId is provided, prioritize loading that specific workout
      if (workoutId) {
        workout = workouts.find(w => w.id === workoutId);
      }

      // If no specific workout ID or not found, find today's workout
      if (!workout) {
        const today = getTodayString();
        workout = workouts.find(w => w.date === today && w.state !== 'completed');
      }
      
      // If no workout for today, get the most recent planned workout
      if (!workout) {
        workout = workouts.find(w => w.state === 'planned' || w.state === 'in_progress');
      }

      // If still no workout, just get the first one
      if (!workout && workouts.length > 0) {
        workout = workouts[0];
      }

      if (workout) {
        setSelectedWorkout(workout);
        const workoutExercises = await getExercisesByWorkout(workout.id);
        // Sort by order_index if available
        workoutExercises.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        setExercises(workoutExercises);
      }
      
      setLoading(false);
    };

    loadWorkout();
  }, [user, workouts, getExercisesByWorkout, workoutId]);

  /**
   * Start the workout
   */
  const handleStartWorkout = async () => {
    if (!selectedWorkout) return;
    setActiveWorkoutStarted(true);
    // Update workout state to in_progress
    await updateWorkout(selectedWorkout.id, { state: 'in_progress' });
  };

  /**
   * Mark an exercise as complete
   */
  const handleToggleExercise = async (exerciseId: string, currentDone: boolean) => {
    await updateExercise(exerciseId, { done: !currentDone });
    // Update local state
    setExercises(prev => 
      prev.map(ex => ex.id === exerciseId ? { ...ex, done: !currentDone } : ex)
    );

    // If marking as done, start rest timer
    if (!currentDone) {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (exercise && exercise.rest_sec) {
        setIsResting(true);
        setRestTimer(exercise.rest_sec);
      }

      // Auto-advance to next incomplete exercise
      const currentIndex = exercises.findIndex(ex => ex.id === exerciseId);
      const nextIncompleteIndex = exercises.findIndex((ex, idx) => idx > currentIndex && !ex.done);
      if (nextIncompleteIndex !== -1) {
        setCurrentExerciseIndex(nextIncompleteIndex);
      }
    }
  };

  /**
   * Skip rest period
   */
  const handleSkipRest = (): void => {
    setIsResting(false);
    setRestTimer(0);
  };

  /**
   * Complete the workout - show feedback modal first
   */
  const handleCompleteWorkout = async () => {
    if (!selectedWorkout) return;
    setShowFeedbackModal(true);
  };

  /**
   * Save workout completion with feedback and RIR values
   */
  const handleSaveWorkoutCompletion = async () => {
    if (!selectedWorkout) return;
    
    try {
      console.log("Starting workout completion process for workout:", selectedWorkout.id);
      
      // Update workout with feedback
      console.log("Updating workout state to completed with feedback:", workoutFeedback || 'Completed via workout page');
      const workoutUpdateSuccess = await updateWorkout(selectedWorkout.id, { 
        state: 'completed',
        feedback: workoutFeedback || 'Completed via workout page'
      });

      if (!workoutUpdateSuccess) {
        console.error("Failed to update workout state to completed");
        throw new Error("Failed to update workout completion status");
      }
      
      console.log("Workout state updated successfully");

      // Update each exercise with RIR values
      console.log("Updating exercise RIR values:", exerciseRirValues);
      for (const exercise of exercises) {
        const rirValue = exerciseRirValues[exercise.id];
        if (rirValue !== undefined) {
          console.log(`Updating exercise ${exercise.name} with RIR: ${rirValue}`);
          const exerciseUpdateSuccess = await updateExercise(exercise.id, { rir: rirValue });
          if (!exerciseUpdateSuccess) {
            console.warn(`Failed to update RIR for exercise ${exercise.name}`);
          }
        }
      }

      // Trigger workout adaptation based on RIR feedback
      await handleWorkoutAdaptation();

      console.log("Workout completion process finished successfully");
      setShowFeedbackModal(false);
      setShowWorkoutComplete(true);
      
      // Force a refresh of the workout data to ensure UI reflects the change
      // Update local state immediately
      if (selectedWorkout) {
        setSelectedWorkout({
          ...selectedWorkout,
          state: 'completed',
          feedback: workoutFeedback || 'Completed via workout page'
        });
      }
    } catch (error) {
      console.error("Error completing workout:", error);
      alert("There was an error completing your workout. Please try again.");
    }
  };

  /**
   * Analyze RIR feedback and suggest adaptations for future workouts
   */
  const handleWorkoutAdaptation = async () => {
    try {
      const adaptations = analyzeWorkoutPerformance();
      setWorkoutAdaptations(adaptations);
      if (adaptations.length > 0) {
        console.log("Workout adaptations suggested:", adaptations);
        // In a full implementation, this could:
        // 1. Update future workout templates
        // 2. Adjust weight recommendations
        // 3. Modify volume/intensity
        // 4. Send to AI planner for consideration
      }
    } catch (error) {
      console.error("Error analyzing workout performance:", error);
    }
  };

  /**
   * Analyze exercise performance based on RIR values
   */
  const analyzeWorkoutPerformance = () => {
    const adaptations: string[] = [];
    
    exercises.forEach(exercise => {
      const rir = exerciseRirValues[exercise.id];
      if (rir !== undefined) {
        const exerciseName = exercise.name || 'Unnamed Exercise';
        
        if (rir < 0) {
          // Failed to complete target reps
          const failedReps = Math.abs(rir);
          if (failedReps === 1) {
            adaptations.push(`${exerciseName}: Reduce load by 5-10% or reduce reps by 1-2 next time (failed 1 rep)`);
          } else if (failedReps <= 3) {
            adaptations.push(`${exerciseName}: Reduce load by 10-15% or reduce reps by ${failedReps} next time (failed ${failedReps} reps)`);
          } else {
            adaptations.push(`${exerciseName}: Significantly reduce load by 20%+ or reduce reps by ${failedReps} next time (too challenging)`);
          }
        } else if (rir === 0) {
          adaptations.push(`${exerciseName}: Perfect difficulty - maintain current load/reps`);
        } else if (rir === 1) {
          adaptations.push(`${exerciseName}: Could increase load by 2.5-5kg or add 1-2 reps next time`);
        } else if (rir >= 2 && rir <= 3) {
          adaptations.push(`${exerciseName}: Could increase load by 5-10kg or add 2-3 reps next time`);
        } else if (rir >= 4) {
          adaptations.push(`${exerciseName}: Too easy - increase load by 10-15kg or add 3-5 reps next time`);
        }
      }
    });

    return adaptations;
  };

  /**
   * Debug function to manually mark workout as completed (for testing)
   */
  const handleForceComplete = async () => {
    if (!selectedWorkout) return;
    
    console.log("Force completing workout:", selectedWorkout.id);
    try {
      const success = await updateWorkout(selectedWorkout.id, { 
        state: 'completed',
        feedback: 'Force completed for debugging'
      });
      
      if (success) {
        console.log("Force completion successful");
        alert("Workout marked as completed!");
        // Update local state
        setSelectedWorkout({
          ...selectedWorkout,
          state: 'completed',
          feedback: 'Force completed for debugging'
        });
      } else {
        console.error("Force completion failed");
        alert("Failed to mark workout as completed");
      }
    } catch (error) {
      console.error("Error in force completion:", error);
      alert("Error: " + error);
    }
  };

  const handleEndWorkout = () => {
    if (window.confirm('Are you sure you want to end this workout? Your progress will be saved.')) {
      (window as any).navigate('/');
    }
  };

  /**
   * Calculate workout progress
   */
  const getWorkoutProgress = (): number => {
    if (exercises.length === 0) return 0;
    const completed = exercises.filter(ex => ex.done).length;
    return Math.round((completed / exercises.length) * 100);
  };

  /**
   * Get elapsed time
   */
  const getElapsedTime = (): string => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - workoutStartTime.getTime()) / 1000 / 60);
    return `${elapsed} min`;
  };

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => prev - 1);
      }, 1000);
    } else if (restTimer === 0) {
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  // Check if workout is complete - don't auto-complete, just show the complete button
  useEffect(() => {
    if (exercises.length > 0 && exercises.every(ex => ex.done) && activeWorkoutStarted && !showFeedbackModal && !showWorkoutComplete) {
      // All exercises are done, user can now complete the workout
      // The complete button will be shown in the UI
    }
  }, [exercises, activeWorkoutStarted, showFeedbackModal, showWorkoutComplete]);

  if (loading) {
    return (
      <>
        <Sidebar currentPage="workouts" />
        <div className="min-h-screen bg-white lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading workout...</p>
          </div>
        </div>
      </>
    );
  }

  if (!selectedWorkout || exercises.length === 0) {
    return (
      <>
        <Sidebar currentPage="workouts" />
        <div className="min-h-screen bg-white lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Workout</h2>
            <p className="text-gray-600 mb-6">
              You don't have any workouts scheduled. Create a workout plan to get started.
            </p>
            <button
              onClick={() => (window as any).navigate('/calendar')}
              className="bg-gray-900 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
            >
              Go to Calendar
            </button>
          </div>
        </div>
      </>
    );
  }

  const allExercisesComplete = exercises.every(ex => ex.done);

  return (
    <>
      <Sidebar currentPage="workouts" />
      <div className="min-h-screen bg-white lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleEndWorkout}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {selectedWorkout.focus || 'Workout Session'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {activeWorkoutStarted && `${getElapsedTime()} • `}
                    {getWorkoutProgress()}% complete
                  </p>
                </div>
              </div>
              {activeWorkoutStarted && (
                <div className="flex gap-2">
                  <button 
                    onClick={handleForceComplete}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 border border-red-300 rounded"
                  >
                    [DEBUG] Force Complete
                  </button>
                  <button 
                    onClick={handleEndWorkout}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    End Workout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Rest Timer Overlay */}
        {isResting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 lg:ml-64">
            <div className="bg-white rounded-lg p-8 mx-4 text-center max-w-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Rest Time</h2>
              <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
                {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Take a break before your next exercise
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSkipRest}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                  Skip Rest
                </button>
                <button
                  onClick={() => setRestTimer(restTimer + 30)}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  +30s
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Collection Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 lg:ml-64">
            <div className="bg-white rounded-lg p-6 mx-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Workout Complete!</h2>
              <p className="text-gray-600 mb-6">
                Please provide feedback on your workout and rate how challenging each exercise was.
              </p>

              {/* Overall Workout Feedback */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Workout Feedback (Optional)
                </label>
                <textarea
                  value={workoutFeedback}
                  onChange={(e) => setWorkoutFeedback(e.target.value)}
                  placeholder="How did the workout feel? Any notes about difficulty, form, or modifications..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* RIR (Reps in Reserve) for each exercise */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Rate Exercise Difficulty (RIR - Reps in Reserve)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  How many more reps could you have done? Use negative values if you couldn't complete all target reps.
                  <br />
                  <strong>Examples:</strong> 0 = couldn't do any more, 2 = could do 2 more, -2 = failed 2 reps short of target
                </p>
                <div className="space-y-4">
                  {exercises.map((exercise, index) => (
                    <div key={exercise.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {index + 1}. {exercise.name || 'Unnamed Exercise'}
                        </span>
                        {exercise.sets && exercise.reps && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({exercise.sets} × {exercise.reps})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">RIR:</label>
                        <select
                          value={exerciseRirValues[exercise.id] || ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            setExerciseRirValues(prev => {
                              if (value === undefined) {
                                const { [exercise.id]: _, ...rest } = prev;
                                return rest;
                              }
                              return {
                                ...prev,
                                [exercise.id]: value
                              };
                            });
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                          <option value="">-</option>
                          <option value="-4">-4 (failed 4+ reps)</option>
                          <option value="-3">-3 (failed 3 reps)</option>
                          <option value="-2">-2 (failed 2 reps)</option>
                          <option value="-1">-1 (failed 1 rep)</option>
                          <option value="0">0 (perfect)</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5+</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkoutCompletion}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  Complete Workout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workout Complete Modal */}
        {showWorkoutComplete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 lg:ml-64">
            <div className="bg-white rounded-lg p-8 mx-4 text-center max-w-md">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">🎉 Workout Complete!</h2>
              <p className="text-gray-600 mb-6">
                Excellent work! You completed all {exercises.length} exercises. Your feedback has been saved.
              </p>

              {/* Show adaptations if any */}
              {workoutAdaptations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Suggested Adaptations for Next Time:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {workoutAdaptations.map((adaptation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{adaptation}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">
                    These suggestions are based on your RIR feedback. Negative RIR means you couldn't complete all target reps, positive means you had reps left in the tank.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => (window as any).navigate('/progress')}
                  className="w-full bg-gray-900 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  View Progress
                </button>
                <button
                  onClick={() => (window as any).navigate('/')}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeWorkoutStarted ? (
              /* Pre-Workout Overview */
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Ready to start your workout?
                </h2>
                <p className="text-gray-600 mb-8">
                  {exercises.length} exercises • Estimated {Math.round(exercises.reduce((acc, ex) => acc + (ex.estimated_duration || 0), 0) / 60)} min
                </p>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900 mb-4">Today's Exercises</h3>
                  <div className="space-y-2 text-left">
                    {exercises.map((exercise, index) => (
                      <div key={exercise.id} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400">{index + 1}.</span>
                        <span className="text-gray-900">{exercise.name || 'Unnamed Exercise'}</span>
                        <span className="text-gray-500 ml-auto">
                          {exercise.sets ? `${exercise.sets}×${exercise.reps || 'time'}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartWorkout}
                  className="bg-gray-900 text-white px-8 py-4 rounded-md font-medium text-lg hover:bg-gray-800 transition-colors"
                >
                  Start Workout
                </button>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gray-900 h-3 transition-all duration-500 ease-out"
                    style={{ width: `${getWorkoutProgress()}%` }}
                  />
                </div>

                {/* Exercise Cards */}
                <div className="space-y-4">
                  {exercises.map((exercise, index) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                      isCurrent={index === currentExerciseIndex}
                      onToggle={handleToggleExercise}
                      onFocus={() => setCurrentExerciseIndex(index)}
                    />
                  ))}
                </div>

                {/* Complete Workout Button */}
                {allExercisesComplete && (
                  <div className="sticky bottom-6 pt-6">
                    <button
                      onClick={handleCompleteWorkout}
                      className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg"
                    >
                      Complete Workout
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

/**
 * Individual Exercise Card Component
 */
function ExerciseCard({ 
  exercise, 
  index, 
  isCurrent, 
  onToggle, 
  onFocus 
}: { 
  exercise: Exercise;
  index: number;
  isCurrent: boolean;
  onToggle: (id: string, currentDone: boolean) => void;
  onFocus: () => void;
}): React.JSX.Element {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [editingVideo, setEditingVideo] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>(exercise.tutorial_video_url || "");
  const { updateExercise } = useExerciseContext();

  const handleSaveVideoUrl = async () => {
    try {
      await updateExercise(exercise.id, { tutorial_video_url: videoUrl || null });
      setEditingVideo(false);
      // Update local state - note: this is a bit of a hack, ideally we'd refresh from context
      (exercise as any).tutorial_video_url = videoUrl || null;
    } catch (error) {
      console.error("Failed to save video URL:", error);
    }
  };

  const handleCancelVideoEdit = () => {
    setVideoUrl(exercise.tutorial_video_url || "");
    setEditingVideo(false);
  };

  return (
    <div 
      className={`border-2 rounded-lg transition-all duration-300 ${
        exercise.done 
          ? 'border-green-500 bg-green-50' 
          : isCurrent 
          ? 'border-gray-900 bg-gray-50 shadow-lg' 
          : 'border-gray-200 bg-white'
      }`}
      onClick={onFocus}
    >
      <div className="p-6">
        {/* Exercise Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                exercise.done ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-gray-900">
                {exercise.name || 'Unnamed Exercise'}
              </h3>
            </div>
            
            {/* Exercise Details */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {exercise.sets && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  {exercise.sets} × {
                    exercise.reps 
                      ? `${exercise.reps} reps`
                      : exercise.name && (
                          exercise.name.toLowerCase().includes('plank') ||
                          exercise.name.toLowerCase().includes('hold') ||
                          exercise.name.toLowerCase().includes('stretch') ||
                          exercise.name.toLowerCase().includes('pose') ||
                          exercise.name.toLowerCase().includes('flow')
                        )
                      ? 'time-based'
                      : 'time-based'
                  }
                </span>
              )}
              {exercise.rest_sec && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {exercise.rest_sec}s rest
                </span>
              )}
              {exercise.load_kg && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {exercise.load_kg} kg
                </span>
              )}
              {exercise.rir !== null && exercise.rir !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  RIR {exercise.rir}
                </span>
              )}
            </div>
          </div>

          {/* Complete Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(exercise.id, exercise.done || false);
            }}
            className={`ml-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              exercise.done 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-300 hover:border-gray-900'
            }`}
          >
            {exercise.done && (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Weight Note */}
        {exercise.weight_note && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-4">
            <strong>Note:</strong> {exercise.weight_note}
          </div>
        )}

        {/* Tutorial Video */}
        {exercise.tutorial_video_url && (
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <strong className="text-sm text-purple-800">Tutorial Video:</strong>
            </div>
            <a
              href={exercise.tutorial_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-700 hover:text-purple-900 underline break-all"
            >
              {exercise.tutorial_video_url.includes('youtube.com') || exercise.tutorial_video_url.includes('youtu.be') 
                ? '▶️ Watch on YouTube' 
                : '🎥 Watch Tutorial'}
            </a>
          </div>
        )}

        {/* Toggle Details */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          {showDetails ? 'Hide' : 'Show'} details
          <svg 
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 text-sm text-gray-600">
            {exercise.estimated_duration && (
              <p><strong>Estimated Duration:</strong> {Math.round(exercise.estimated_duration / 60)} min</p>
            )}
            {exercise.created_at && (
              <p><strong>Added:</strong> {new Date(exercise.created_at).toLocaleDateString()}</p>
            )}
            
            {/* Tutorial Video Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <strong>Tutorial Video:</strong>
                {!editingVideo && (
                  <button
                    onClick={() => setEditingVideo(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-300"
                  >
                    {exercise.tutorial_video_url ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              
              {editingVideo ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or any video URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveVideoUrl}
                      className="px-3 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelVideoEdit}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : exercise.tutorial_video_url ? (
                <a
                  href={exercise.tutorial_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 hover:text-purple-900 underline text-sm"
                >
                  {exercise.tutorial_video_url.includes('youtube.com') || exercise.tutorial_video_url.includes('youtu.be') 
                    ? '▶️ Watch on YouTube' 
                    : '🎥 Watch Tutorial'}
                </a>
              ) : (
                <p className="text-gray-400 text-sm">No tutorial video added</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
