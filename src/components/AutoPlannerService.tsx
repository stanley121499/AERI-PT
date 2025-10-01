/**
 * Auto Planner Service Component
 * 
 * Background service that automatically generates workout plans.
 * Runs silently and fills gaps in the user's schedule.
 */

import React, { useEffect, useState } from "react";
import { useAutoPlanner } from "../hooks/useAutoPlanner";

export function AutoPlannerService(): React.JSX.Element | null {
  const { status } = useAutoPlanner({
    enabled: true,
    horizonDays: 7,          // Plan 7 days ahead
    minGapDays: 3,           // Trigger if 3+ days are missing
    checkIntervalMs: 60 * 60 * 1000, // Check every hour
  });

  const [showNotification, setShowNotification] = useState(false);

  // Show notification when workouts are auto-generated
  useEffect(() => {
    if (status.gapsFilled > 0 && status.lastPlanTime) {
      setShowNotification(true);
      
      // Hide after 10 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [status.gapsFilled, status.lastPlanTime]);

  // Show notification banner
  if (showNotification && status.gapsFilled > 0) {
    return (
      <div className="fixed top-4 right-4 z-50 animate-slide-in">
        <div className="bg-green-600 text-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">AI Planner Active</h3>
              <p className="text-sm text-green-100">
                Auto-generated {status.gapsFilled} workout{status.gapsFilled > 1 ? "s" : ""} for your upcoming week!
              </p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="text-white hover:text-green-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Service runs silently in the background
  return null;
}

