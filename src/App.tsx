import React from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { TierProvider } from "./contexts/TierContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { ExerciseProvider } from "./contexts/ExerciseContext";
import { UserInfoProvider } from "./contexts/UserInfoContext";
import { Router } from "./components/Router";
import { AutoPlannerService } from "./components/AutoPlannerService";
import "./App.css";

/**
 * Main App component for Setwise AI Workout App
 * Implements the brand identity with adaptive coaching features
 */
function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <TierProvider>
        <WorkoutProvider>
          <ExerciseProvider>
            <UserInfoProvider>
              <AutoPlannerService />
              <Router />
            </UserInfoProvider>
          </ExerciseProvider>
        </WorkoutProvider>
      </TierProvider>
    </AuthProvider>
  );
}

export default App;
