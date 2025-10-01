import React, { useState, useEffect } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useUserInfoContext } from "../contexts/UserInfoContext";
import { Sidebar } from "./Sidebar";

/**
 * Calendar component for workout planning
 */
function Calendar({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (date: Date) => void }): React.JSX.Element {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
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
  
  const isToday = (date: Date): boolean => {
    return date.toDateString() === today.toDateString();
  };
  
  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };
  
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month;
  };
  
  const hasWorkout = (date: Date): boolean => {
    // Mock data - in real app, check if date has scheduled workout
    const dayOfWeek = date.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5; // Mon, Wed, Fri
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
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="text-center text-xs font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(date)}
            className={`
              relative p-2 text-sm rounded transition-colors hover:bg-gray-50
              ${!isCurrentMonth(date) ? 'text-gray-300' : 'text-gray-700'}
              ${isToday(date) ? 'bg-gray-100 text-gray-900 font-medium' : ''}
              ${isSelected(date) ? 'bg-gray-900 text-white font-medium' : ''}
            `}
          >
            {date.getDate()}
            {hasWorkout(date) && isCurrentMonth(date) && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard component for the Setwise AI workout app
 * Implements the brand identity with adaptive coaching features
 */
export function Dashboard(): React.JSX.Element {
  const { user } = useAuthContext();
  const { userInfo } = useUserInfoContext();
  const [selectedTime, setSelectedTime] = useState<number>(15);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Mock data for demonstration - in real app, this would come from contexts/API
  const [stats, setStats] = useState({
    streak: 7,
    totalWorkouts: 23,
    avgRPE: 4.2,
    weeklyVolume: 2847,
    strengthGain: 8.5,
    consistency: 85,
    recovery: "Good"
  });

  const [recentActivity] = useState([
    {
      id: 1,
      icon: "💪",
      title: "Push Day Complete",
      subtitle: "8 exercises • 32 minutes",
      time: "2h ago"
    },
    {
      id: 2,
      icon: "🏆",
      title: "New PR: Bench Press",
      subtitle: "185 lbs × 5 reps",
      time: "Yesterday"
    },
    {
      id: 3,
      icon: "📊",
      title: "Weekly Summary",
      subtitle: "4 workouts • 2.1k volume",
      time: "3d ago"
    }
  ]);

  /**
   * Handle time selection for quick start
   */
  const handleTimeSelection = (time: number): void => {
    setSelectedTime(time);
  };

  /**
   * Handle workout start with haptic feedback simulation
   */
  const handleStartWorkout = (): void => {
    setIsLoading(true);
    
    // Simulate haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Simulate loading state
    setTimeout(() => {
      setIsLoading(false);
      // In real app, navigate to workout screen
      console.log(`Starting ${selectedTime} minute workout`);
    }, 1000);
  };

  /**
   * Handle date selection for planning
   */
  const handleDateSelect = (date: Date): void => {
    setSelectedDate(date);
  };

  /**
   * Get greeting based on time of day
   */
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  /**
   * Get user's first name or fallback
   */
  const getUserName = (): string => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "there";
  };

  return (
    <>
      <Sidebar currentPage="dashboard" />
      <div className="min-h-screen bg-white">
        {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="px-6 py-8 lg:ml-64">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                  {getGreeting()}, {getUserName()}
                </h1>
                <p className="text-gray-500">
                  Ready to build strength today?
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{stats.streak}</div>
                  <div className="text-sm text-gray-500">Day streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{stats.totalWorkouts}</div>
                  <div className="text-sm text-gray-500">Workouts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{stats.avgRPE}</div>
                  <div className="text-sm text-gray-500">Avg RPE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Quick Start & Progress */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Start Section */}
              <section>
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Today's Workout
                </h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    How much time do you have?
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    We'll adapt your workout based on your schedule
                  </p>
                  
                  {/* Time Selection */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { time: 15, label: "Quick" },
                      { time: 30, label: "Standard" },
                      { time: 45, label: "Full" }
                    ].map((option) => (
                      <button
                        key={option.time}
                        onClick={() => handleTimeSelection(option.time)}
                        className={`p-3 rounded-md text-center transition-colors ${
                          selectedTime === option.time
                            ? "bg-gray-900 text-white"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium">{option.time} min</div>
                        <div className="text-xs opacity-70">{option.label}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Start Button */}
                  <button
                    onClick={handleStartWorkout}
                    disabled={isLoading}
                    className="w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Starting..." : `Start ${selectedTime}min Workout`}
                  </button>
                </div>
              </section>

              {/* Progress Overview */}
              <section>
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  This Week
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Volume</div>
                    <div className="text-xl font-semibold text-gray-900 mb-1">
                      {stats.weeklyVolume.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600">+12% vs last week</div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Strength</div>
                    <div className="text-xl font-semibold text-gray-900 mb-1">
                      +{stats.strengthGain}%
                    </div>
                    <div className="text-xs text-green-600">Bench press PR</div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Consistency</div>
                    <div className="text-xl font-semibold text-gray-900 mb-1">
                      {stats.consistency}%
                    </div>
                    <div className="text-xs text-green-600">+5% this month</div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Recovery</div>
                    <div className="text-xl font-semibold text-gray-900 mb-1">
                      {stats.recovery}
                    </div>
                    <div className="text-xs text-green-600">Ready to train</div>
                  </div>
                </div>
              </section>

              {/* Recent Activity */}
              <section>
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Recent Activity
                </h2>
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{activity.title}</div>
                        <div className="text-sm text-gray-500">{activity.subtitle}</div>
                      </div>
                      <div className="text-xs text-gray-400">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column - Calendar & Planning */}
            <div className="space-y-8">
              {/* Calendar */}
              <section>
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Calendar
                </h2>
                <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
              </section>

              {/* Selected Date Workout Plan */}
              <section>
                <h2 className="text-base font-medium text-gray-900 mb-4">
                  {selectedDate.toDateString() === new Date().toDateString() 
                    ? "Today's Plan" 
                    : `${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} Plan`
                  }
                </h2>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  {selectedDate.toDateString() === new Date().toDateString() ? (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-lg">💪</span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Ready to start?</h3>
                      <p className="text-xs text-gray-500 mb-4">Your adaptive workout is ready.</p>
                      <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
                        Start Workout
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-lg">📅</span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Plan your workout</h3>
                      <p className="text-xs text-gray-500 mb-4">Schedule a workout for this day.</p>
                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                        Schedule Workout
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Quick Actions */}
              <section>
                <h2 className="text-base font-medium text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  <button className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="text-sm font-medium text-gray-900">Schedule Next Week</div>
                    <div className="text-xs text-gray-500">Plan upcoming workouts</div>
                  </button>
                  <button className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="text-sm font-medium text-gray-900">Set Goals</div>
                    <div className="text-xs text-gray-500">Define objectives</div>
                  </button>
                  <button className="w-full bg-white border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="text-sm font-medium text-gray-900">View Progress</div>
                    <div className="text-xs text-gray-500">Track improvement</div>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      </div>
    </>
  );
}
