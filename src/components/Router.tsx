import React, { useState, useEffect } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { Dashboard } from "./Dashboard";
import { WorkoutPage } from "./WorkoutPage";
import { CalendarPage } from "./CalendarPage";
import { ProgressPage } from "./ProgressPage";
import { ProfilePage } from "./ProfilePage";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { AIPlannerDemo } from "./AIPlannerDemo";

/**
 * Client-side router for the Setwise app with authentication support
 */
export function Router(): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const { user, loading } = useAuthContext();

  useEffect(() => {
    const handlePopState = (): void => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /**
   * Navigate to a new path
   */
  const navigate = (path: string): void => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // Make navigate function available globally for navigation
  (window as any).navigate = navigate;

  // If still loading auth state, show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-semibold text-sm">S</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes (accessible when not authenticated)
  const publicRoutes = ["/login", "/signup", "/forgot-password"];
  const isPublicRoute = publicRoutes.includes(currentPath);

  // If user is authenticated and trying to access public routes, redirect to dashboard
  if (user && isPublicRoute) {
    window.history.replaceState({}, "", "/");
    setCurrentPath("/");
  }

  // Route components based on current path
  switch (currentPath) {
    // Public routes
    case "/login":
      return <LoginPage />;
    case "/signup":
      return <SignupPage />;
    case "/forgot-password":
      return <ForgotPasswordPage />;
    
    // Protected routes
    case "/":
      return (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
    case "/workouts":
      return (
        <ProtectedRoute>
          <WorkoutPage />
        </ProtectedRoute>
      );
    case "/calendar":
      return (
        <ProtectedRoute>
          <CalendarPage />
        </ProtectedRoute>
      );
    case "/progress":
      return (
        <ProtectedRoute>
          <ProgressPage />
        </ProtectedRoute>
      );
    case "/profile":
      return (
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      );
    case "/ai-planner":
      return (
        <ProtectedRoute>
          <AIPlannerDemo />
        </ProtectedRoute>
      );
    
    // Default fallback
    default:
      return (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
  }
}
