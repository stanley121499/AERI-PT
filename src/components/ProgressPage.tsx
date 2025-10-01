import React, { useState } from "react";
import { Sidebar } from "./Sidebar";

/**
 * Progress tracking page with analytics and charts
 */
export function ProgressPage(): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("3M");
  const [selectedMetric, setSelectedMetric] = useState<string>("volume");

  // Mock data for charts and progress
  const progressData = {
    volume: {
      current: 12450,
      previous: 11200,
      change: 11.2,
      unit: "lbs",
      data: [8500, 9200, 10100, 10800, 11200, 11800, 12450]
    },
    strength: {
      current: 185,
      previous: 165,
      change: 12.1,
      unit: "lbs",
      data: [145, 155, 160, 165, 170, 178, 185]
    },
    frequency: {
      current: 4.2,
      previous: 3.8,
      change: 10.5,
      unit: "per week",
      data: [3.2, 3.5, 3.8, 3.9, 4.0, 4.1, 4.2]
    },
    duration: {
      current: 42,
      previous: 38,
      change: 10.5,
      unit: "min avg",
      data: [35, 36, 37, 38, 39, 41, 42]
    }
  };

  const achievements = [
    { id: 1, title: "First PR", description: "Set your first personal record", date: "2 weeks ago", icon: "🏆" },
    { id: 2, title: "Consistency King", description: "7 day workout streak", date: "1 week ago", icon: "🔥" },
    { id: 3, title: "Volume Milestone", description: "10,000 lbs total volume", date: "3 days ago", icon: "💪" },
    { id: 4, title: "Form Master", description: "Perfect form on 50 sets", date: "Yesterday", icon: "✨" },
  ];

  const personalRecords = [
    { exercise: "Bench Press", weight: 185, reps: 5, date: "2 days ago", improvement: "+10 lbs" },
    { exercise: "Squat", weight: 225, reps: 3, date: "1 week ago", improvement: "+15 lbs" },
    { exercise: "Deadlift", weight: 275, reps: 1, date: "2 weeks ago", improvement: "+20 lbs" },
    { exercise: "Overhead Press", weight: 115, reps: 8, date: "3 weeks ago", improvement: "+5 lbs" },
  ];

  const bodyMeasurements = [
    { part: "Weight", current: "175 lbs", change: "+2 lbs", trend: "up" },
    { part: "Body Fat", current: "15%", change: "-1%", trend: "down" },
    { part: "Chest", current: "42 in", change: "+0.5 in", trend: "up" },
    { part: "Arms", current: "15 in", change: "+0.3 in", trend: "up" },
  ];

  const periods = ["1M", "3M", "6M", "1Y"];
  const metrics = [
    { key: "volume", label: "Volume" },
    { key: "strength", label: "Strength" },
    { key: "frequency", label: "Frequency" },
    { key: "duration", label: "Duration" }
  ];

  const currentMetricData = progressData[selectedMetric as keyof typeof progressData];

  return (
    <>
      <Sidebar currentPage="progress" />
      <div className="min-h-screen bg-white lg:ml-64">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Progress</h1>
              <p className="text-gray-500 mt-1">Track your fitness journey</p>
            </div>
            <div className="flex gap-2">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === period
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(progressData).map(([key, data]) => (
              <div
                key={key}
                className={`bg-white border rounded-lg p-6 cursor-pointer transition-colors ${
                  selectedMetric === key ? "border-gray-900" : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedMetric(key)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 capitalize">{key}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    data.change > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {data.change > 0 ? "+" : ""}{data.change.toFixed(1)}%
                  </span>
                </div>
                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {data.current.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{data.unit}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {selectedMetric} Trend
              </h2>
              <div className="flex gap-2">
                {metrics.map((metric) => (
                  <button
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      selectedMetric === metric.key
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simple Chart Visualization */}
            <div className="h-64 flex items-end justify-between gap-2">
              {currentMetricData.data.map((value, index) => {
                const maxValue = Math.max(...currentMetricData.data);
                const height = (value / maxValue) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="text-xs text-gray-500 mb-2">
                      {value.toLocaleString()}
                    </div>
                    <div
                      className="w-full bg-gray-900 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs text-gray-400 mt-2">
                      W{index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Records */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Records</h2>
              <div className="space-y-4">
                {personalRecords.map((pr, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{pr.exercise}</div>
                      <div className="text-sm text-gray-500">{pr.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {pr.weight} lbs × {pr.reps}
                      </div>
                      <div className="text-sm text-green-600">{pr.improvement}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Achievements</h2>
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-3 py-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{achievement.title}</div>
                      <div className="text-sm text-gray-600">{achievement.description}</div>
                      <div className="text-xs text-gray-400 mt-1">{achievement.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Measurements */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Body Measurements</h2>
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  Add Entry
                </button>
              </div>
              <div className="space-y-4">
                {bodyMeasurements.map((measurement, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="font-medium text-gray-900">{measurement.part}</div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{measurement.current}</div>
                      <div className={`text-sm ${
                        measurement.trend === "up" ? "text-green-600" : "text-red-600"
                      }`}>
                        {measurement.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workout Consistency */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Workout Consistency</h2>
              
              {/* Weekly Grid */}
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">Last 12 weeks</div>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 84 }, (_, i) => {
                    const intensity = Math.random();
                    return (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${
                          intensity > 0.7
                            ? "bg-gray-900"
                            : intensity > 0.4
                            ? "bg-gray-400"
                            : intensity > 0.2
                            ? "bg-gray-200"
                            : "bg-gray-100"
                        }`}
                        title={`Week ${Math.floor(i / 7) + 1}, Day ${(i % 7) + 1}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-gray-100 rounded-sm" />
                    <div className="w-3 h-3 bg-gray-200 rounded-sm" />
                    <div className="w-3 h-3 bg-gray-400 rounded-sm" />
                    <div className="w-3 h-3 bg-gray-900 rounded-sm" />
                  </div>
                  <span>More</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">7</div>
                    <div className="text-sm text-gray-500">Current Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">15</div>
                    <div className="text-sm text-gray-500">Longest Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">85%</div>
                    <div className="text-sm text-gray-500">This Month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  );
}
