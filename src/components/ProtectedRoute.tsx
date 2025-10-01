import React from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { LoginPage } from "./LoginPage";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that ensures only authenticated users can access certain pages
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): React.JSX.Element {
  const { user, loading } = useAuthContext();

  // Show loading state while checking authentication
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

  // If user is not authenticated, show login page
  if (!user) {
    return <LoginPage />;
  }

  // If user is authenticated, render the protected content
  return <>{children}</>;
}

