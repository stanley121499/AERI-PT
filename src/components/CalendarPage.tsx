import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { useAuthContext } from "../contexts/AuthContext";
import { useWorkoutContext, Workout } from "../contexts/WorkoutContext";
import { useExerciseContext, Exercise } from "../contexts/ExerciseContext";
import { useUserInfoContext } from "../contexts/UserInfoContext";
import { planAndCompile, userInfoToProfile, exercisePlanToDbInsert, dbWorkoutToHistoryDay, dbEventToUserEvent } from "../ai";
import { supabase } from "../lib/supabase";
import { getLocalDateString, getTodayString } from "../utils/dateUtils";

/**
 * Dedicated calendar page for workout planning and scheduling
 * Now fully integrated with database and AI planner
 */
export function CalendarPage(): React.JSX.Element {
  const { user } = useAuthContext();
  const { workouts, createWorkout, deleteWorkout } = useWorkoutContext();
  const { getExercisesByWorkout } = useExerciseContext();
  const { userInfo } = useUserInfoContext();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showWorkoutDetailModal, setShowWorkoutDetailModal] = useState<boolean>(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedWorkoutExercises, setSelectedWorkoutExercises] = useState<Exercise[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);

  const today = useMemo(() => new Date(), []);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days = [];
  const current = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Load workout exercises when a workout is selected
  useEffect(() => {
    const loadWorkoutDetails = async () => {
      if (selectedWorkout) {
        setLoadingExercises(true);
        const exercises = await getExercisesByWorkout(selectedWorkout.id);
        exercises.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        setSelectedWorkoutExercises(exercises);
        setLoadingExercises(false);
      }
    };
    loadWorkoutDetails();
  }, [selectedWorkout, getExercisesByWorkout]);

  // Calculate stats for current month
  const monthStats = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    const monthWorkouts = workouts.filter(w => {
      if (!w.date) return false;
      const workoutDate = new Date(w.date);
      return workoutDate >= monthStart && workoutDate <= monthEnd;
    });

    const completed = monthWorkouts.filter(w => w.state === 'completed').length;
    const total = monthWorkouts.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate streak
    let streak = 0;
    const sortedWorkouts = [...workouts]
      .filter(w => w.state === 'completed' && w.date)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
    
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.date!);
      workoutDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((checkDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0 || diffDays === 1) {
        streak++;
        checkDate = workoutDate;
      } else {
        break;
      }
    }

    return {
      total: monthWorkouts.length,
      completed,
      completionRate,
      streak
    };
  }, [workouts, year, month]);

  // Get upcoming workouts
  const upcomingWorkouts = useMemo(() => {
    const todayStr = getTodayString();
    return workouts
      .filter(w => w.date && w.date >= todayStr && w.state !== 'completed')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 5)
      .map(w => ({
        id: w.id,
        workout: w,
        dateStr: w.date || '',
        focus: w.focus || 'Workout'
      }));
  }, [workouts, today]);

  const isToday = (date: Date): boolean => {
    return date.toDateString() === today.toDateString();
  };
  
  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };
  
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month;
  };
  
  const getWorkoutForDate = (date: Date): Workout | undefined => {
    const dateStr = getLocalDateString(date);
    return workouts.find(w => w.date === dateStr);
  };
  
  const navigateMonth = (direction: 'prev' | 'next'): void => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (date: Date): void => {
    setSelectedDate(date);
  };

  const handleScheduleClick = (): void => {
    setShowScheduleModal(true);
  };

  const handleWorkoutClick = async (workout: Workout): Promise<void> => {
    setSelectedWorkout(workout);
    setShowWorkoutDetailModal(true);
  };

  const handleStartWorkout = (workoutId: string): void => {
    (window as any).navigate("/workouts", { id: workoutId });
  };

  const handleDeleteWorkout = async (workoutId: string): Promise<void> => {
    console.log("Delete workout called with ID:", workoutId);
    if (window.confirm('Are you sure you want to delete this workout?')) {
      console.log("User confirmed deletion, calling deleteWorkout...");
      try {
        // First delete associated exercises with more specific error handling
        console.log("Deleting exercises for workout:", workoutId);
        const { error: exerciseError, count: exerciseCount } = await supabase
          .from("exercise")
          .delete({ count: 'exact' })
          .eq("workout_id", workoutId);
          
        if (exerciseError) {
          console.error("Error deleting exercises:", exerciseError);
          alert(`Failed to delete exercises: ${exerciseError.message}`);
          return;
        } else {
          console.log(`Successfully deleted ${exerciseCount || 0} exercises for workout:`, workoutId);
        }

        // Add a small delay to ensure the database transaction is complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then delete the workout with more specific error handling
        console.log("Now deleting the workout itself...");
        const { error: workoutError } = await supabase
          .from("workouts")
          .delete()
          .eq("id", workoutId);

        if (workoutError) {
          console.error("Error deleting workout:", workoutError);
          alert(`Failed to delete workout: ${workoutError.message}`);
          return;
        }

        console.log("Workout deleted successfully from database");
        
        // Close modal and clear selection
        setShowWorkoutDetailModal(false);
        setSelectedWorkout(null);
        
        // Show success message
        alert("Workout deleted successfully! You can now generate a new one.");
        
      } catch (error) {
        console.error("Exception during deletion:", error);
        alert("Error deleting workout: " + error);
      }
    } else {
      console.log("User cancelled deletion");
    }
  };

  /**
   * Generate workout plan with AI for selected date
   */
  const handleGenerateWithAI = async (): Promise<void> => {
    if (!user || !userInfo) {
      alert('Please complete your profile first');
      return;
    }

    setIsGenerating(true);

    try {
      // Get recent workouts for context
      const dateStr = getLocalDateString(selectedDate);
      const recentWorkouts = workouts
        .filter(w => w.date && w.date < dateStr)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 14);

      // Build history
      const recent_history = recentWorkouts.map(w => dbWorkoutToHistoryDay(w));

      // Get user events
      const { data: userEvents } = await supabase
        .from('user_events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      const events = (userEvents || []).map(dbEventToUserEvent);

      // Build context
      const context = {
        today: dateStr,
        horizon_days: 1,
        profile: userInfoToProfile(userInfo),
        recent_history,
        events,
      };

      // Generate 1 day workout
      const compiledDays = await planAndCompile(context, {
        horizonDays: 1,
        aiSeasoning: true,
      });

      if (compiledDays.length === 0) {
        throw new Error('No workout generated');
      }

      const day = compiledDays[0];

      // Create workout with the selected date
      const workout = await createWorkout({
        date: dateStr,
        action: day.action,
        focus: day.focus,
        tags: day.tags,
        state: 'planned',
        plan_meta: { ...day.meta, ai_generated: true },
      });

      if (!workout) {
        throw new Error('Failed to create workout');
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
          throw exerciseError;
        }
      }

      setShowScheduleModal(false);
      alert(`✅ Generated ${day.focus || 'workout'} with ${day.exercises.length} exercises!`);
    } catch (error) {
      console.error('Error generating workout:', error);
      alert('Failed to generate workout. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Quick create workout without AI
   */
  const handleQuickCreate = async (focusArea: string): Promise<void> => {
    const workout = await createWorkout({
      date: getLocalDateString(selectedDate),
      action: 'workout',
      focus: focusArea,
      state: 'planned',
    });

    if (workout) {
      setShowScheduleModal(false);
      alert(`Created ${focusArea} workout!`);
    }
  };

  return (
    <>
      <Sidebar currentPage="calendar" />
      <div className="min-h-screen bg-white lg:ml-64">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
              <p className="text-gray-500 mt-1">
                {monthStats.total} workouts this month • {monthStats.streak} day streak
              </p>
            </div>
            <button
              onClick={handleScheduleClick}
              className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors"
            >
              + Schedule Workout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-lg">
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {monthNames[month]} {year}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-6">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-px mb-4">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-px">
                    {days.map((date, index) => {
                      const workout = getWorkoutForDate(date);
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            handleDateSelect(date);
                            if (workout) {
                              handleWorkoutClick(workout);
                            }
                          }}
                          className={`
                            relative min-h-[80px] p-2 text-left border border-gray-100 hover:bg-gray-50 transition-colors
                            ${!isCurrentMonth(date) ? 'text-gray-300 bg-gray-50' : 'text-gray-700'}
                            ${isToday(date) ? 'bg-blue-50 border-blue-200' : ''}
                            ${isSelected(date) ? 'ring-2 ring-gray-900' : ''}
                          `}
                        >
                          <span className={`text-sm font-medium ${isSelected(date) ? 'text-gray-900' : ''}`}>
                            {date.getDate()}
                          </span>
                          {workout && (
                            <div 
                              className={`mt-1 text-xs px-2 py-1 rounded-full truncate ${
                                workout.state === 'completed'
                                  ? 'bg-green-100 text-green-800' 
                                  : workout.state === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                              title={workout.focus || 'Workout'}
                            >
                              {workout.focus || 'Workout'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Selected Date Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                
                {(() => {
                  const workout = getWorkoutForDate(selectedDate);
                  if (workout) {
                    return (
                      <div className="space-y-3">
                        <div className={`px-3 py-2 rounded-md ${
                          workout.state === 'completed' 
                            ? 'bg-green-50 text-green-800' 
                            : workout.state === 'in_progress'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-gray-50 text-gray-700'
                        }`}>
                          <div className="font-medium">{workout.focus || 'Workout'}</div>
                          <div className="text-sm opacity-75 capitalize">
                            {workout.state === 'completed' ? 'Completed' 
                              : workout.state === 'in_progress' ? 'In Progress' 
                              : 'Scheduled'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleWorkoutClick(workout)}
                            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            Details
                          </button>
                          <button 
                            onClick={() => handleStartWorkout(workout.id)}
                            className="flex-1 bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                          >
                            {workout.state === 'completed' ? 'View' : 'Start'}
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-4">
                        <div className="text-gray-400 mb-3">No workout scheduled</div>
                        <button
                          onClick={handleScheduleClick}
                          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                          + Schedule Workout
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Upcoming Workouts */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Upcoming</h3>
                {upcomingWorkouts.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingWorkouts.map((item) => {
                      const date = new Date(item.dateStr);
                      const isToday = date.toDateString() === today.toDateString();
                      const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();
                      const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleWorkoutClick(item.workout)}
                          className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors"
                        >
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{item.focus}</div>
                            <div className="text-sm text-gray-500">{dateLabel}</div>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No upcoming workouts</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">This Month</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Workouts</span>
                    <span className="font-semibold">{monthStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold">{monthStats.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Streak</span>
                    <span className="font-semibold">{monthStats.streak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion</span>
                    <span className="font-semibold">{monthStats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Schedule Workout Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 lg:ml-64">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Schedule Workout</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* AI Generation */}
              <button
                onClick={handleGenerateWithAI}
                disabled={isGenerating}
                className="w-full p-4 border-2 border-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {isGenerating ? 'Generating...' : 'Generate with AI'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Personalized workout based on your history
                    </div>
                  </div>
                </div>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or quick create</span>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="grid grid-cols-2 gap-3">
                {['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'].map((focusArea) => (
                  <button
                    key={focusArea}
                    onClick={() => handleQuickCreate(focusArea)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <div className="font-medium text-gray-900">{focusArea}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workout Detail Modal */}
      {showWorkoutDetailModal && selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 lg:ml-64">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedWorkout.focus || 'Workout'}
                </h2>
                <button
                  onClick={() => {
                    setShowWorkoutDetailModal(false);
                    setSelectedWorkout(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedWorkout.state === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : selectedWorkout.state === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedWorkout.state === 'completed' ? 'Completed'
                    : selectedWorkout.state === 'in_progress' ? 'In Progress'
                    : 'Planned'}
                </span>
                {selectedWorkout.date && (
                  <span className="text-sm text-gray-500">
                    {new Date(selectedWorkout.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {/* Exercise List */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Exercises</h3>
                {loadingExercises ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : selectedWorkoutExercises.length > 0 ? (
                  <div className="space-y-2">
                    {selectedWorkoutExercises.map((exercise, index) => (
                      <div 
                        key={exercise.id} 
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-400 mt-0.5">{index + 1}.</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{exercise.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {exercise.sets && exercise.reps && `${exercise.sets} × ${exercise.reps} reps`}
                            {exercise.load_kg && ` • ${exercise.load_kg} kg`}
                            {exercise.rest_sec && ` • ${exercise.rest_sec}s rest`}
                          </div>
                        </div>
                        {exercise.done && (
                          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No exercises yet</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleStartWorkout(selectedWorkout.id)}
                  className="w-full bg-gray-900 text-white px-4 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  {selectedWorkout.state === 'completed' ? 'View Workout' : 'Start Workout'}
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWorkoutDetailModal(false);
                      setSelectedWorkout(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleDeleteWorkout(selectedWorkout.id)}
                    className="flex-1 bg-red-50 text-red-700 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
