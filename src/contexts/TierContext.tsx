import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
// import { supabase } from "../lib/supabase"; // Not used in this simplified version
import { useAuthContext } from "./AuthContext";

export type UserTier = "tier1" | "tier2" | "admin";

// Since user_details table doesn't exist in your schema, we'll create a simple tier system
// You can store this in localStorage or create the table in Supabase
export interface UserDetails {
  user_id: string;
  tier: UserTier;
  created_at: string;
  updated_at: string;
}

export type UserDetailsWithEmail = UserDetails & {
  email?: string;
};

interface TierContextProps {
  loading: boolean;
  userDetails: UserDetails | null;
  tier: UserTier;
  isAdmin: boolean;
  isTier2OrHigher: boolean;
  updateUserTier: (userId: string, newTier: UserTier) => Promise<boolean>;
  getAllUserDetails: () => Promise<UserDetailsWithEmail[]>;
}

const TierContext = createContext<TierContextProps | undefined>(undefined);

/**
 * TierProvider component that manages user tier state and provides tier-related functions
 */
export function TierProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const { user } = useAuthContext();
  
  // Use ref to avoid closure issues in real-time handlers
  const userRef = useRef(user);
  
  // Update ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) {
        setUserDetails(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // For now, we'll use localStorage to store tier information
        // In a real app, you'd want to create a user_details table in Supabase
        const storedTier = localStorage.getItem(`user_tier_${user.id}`);
        const tier: UserTier = storedTier as UserTier || "tier1";
        
        const userDetails: UserDetails = {
          user_id: user.id,
          tier,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setUserDetails(userDetails);
      } catch (error) {
        console.error("TierContext - Exception loading user tier:", error);
        setUserDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user]);

  /**
   * Update a user's tier - Admin only function
   */
  const updateUserTier = useCallback(async (userId: string, newTier: UserTier): Promise<boolean> => {
    if (!userDetails || userDetails.tier !== "admin") {
      console.error("TierContext - Unauthorized tier update attempt");
      return false;
    }

    try {
      // Store in localStorage for now
      localStorage.setItem(`user_tier_${userId}`, newTier);
      
      // If updating current user, update state
      if (userId === user?.id) {
        setUserDetails(prev => prev ? { ...prev, tier: newTier, updated_at: new Date().toISOString() } : null);
      }

      console.log("TierContext - Successfully updated user tier:", userId, newTier);
      return true;
    } catch (error) {
      console.error("TierContext - Exception updating user tier:", error);
      return false;
    }
  }, [userDetails, user]);

  /**
   * Get all user details with emails - Admin only function
   */
  const getAllUserDetails = useCallback(async (): Promise<UserDetailsWithEmail[]> => {
    if (!userDetails || userDetails.tier !== "admin") {
      console.error("TierContext - Unauthorized getAllUserDetails attempt");
      return [];
    }

    try {
      // This is a simplified version - in a real app you'd query the database
      // For now, we'll return just the current user's details
      const currentUserDetails: UserDetailsWithEmail = {
        ...userDetails,
        email: user?.email || "Unknown"
      };

      console.log("TierContext - Fetched user details:", [currentUserDetails]);
      return [currentUserDetails];
    } catch (error) {
      console.error("TierContext - Exception fetching all user details:", error);
      return [];
    }
  }, [userDetails, user]);

  // Computed values for easy access
  const tier: UserTier = userDetails?.tier || "tier1";
  const isAdmin: boolean = tier === "admin";
  const isTier2OrHigher: boolean = tier === "tier2" || tier === "admin";

  const value: TierContextProps = {
    loading,
    userDetails,
    tier,
    isAdmin,
    isTier2OrHigher,
    updateUserTier,
    getAllUserDetails,
  };

  return (
    <TierContext.Provider value={value}>
      {children}
    </TierContext.Provider>
  );
}

/**
 * Hook to use the TierContext
 */
export function useTierContext(): TierContextProps {
  const context = useContext(TierContext);
  if (context === undefined) {
    throw new Error("useTierContext must be used within a TierProvider");
  }
  return context;
}

/**
 * Convenience hook for checking tier access
 */
export function useTierAccess() {
  const { tier, isAdmin, isTier2OrHigher } = useTierContext();
  
  return {
    tier,
    isAdmin,
    isTier2OrHigher,
    hasDestinyNavigatorAccess: isTier2OrHigher,
    hasAnalyticsAccess: isTier2OrHigher,
    canManageUsers: isAdmin,
  };
}
