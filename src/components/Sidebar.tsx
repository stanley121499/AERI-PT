import React from "react";

interface SidebarProps {
  currentPage: string;
}

/**
 * Shared sidebar component for navigation
 */
export function Sidebar({ currentPage }: SidebarProps): React.JSX.Element {
  const handleNavigation = (path: string): void => {
    if ((window as any).navigate) {
      (window as any).navigate(path);
    }
  };

  const navigationItems = [
    { label: "Dashboard", icon: "🏠", path: "/", key: "dashboard" },
    { label: "Workouts", icon: "💪", path: "/workouts", key: "workouts" },
    { label: "Calendar", icon: "📅", path: "/calendar", key: "calendar" },
    { label: "Progress", icon: "📊", path: "/progress", key: "progress" },
    { label: "Profile", icon: "👤", path: "/profile", key: "profile" },
    { label: "AI Planner", icon: "🤖", path: "/ai-planner", key: "ai-planner" }
  ];

  return (
    <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">S</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">Setwise</span>
        </div>
        
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                currentPage === item.key
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
