import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { Database } from "../../database.types";
import { useAuthContext } from "./AuthContext";

export type UserInfo = Database["public"]["Tables"]["user_info"]["Row"];
export type UserInfoInsert = Database["public"]["Tables"]["user_info"]["Insert"];
export type UserInfoUpdate = Database["public"]["Tables"]["user_info"]["Update"];

interface UserInfoContextProps {
  loading: boolean;
  userInfo: UserInfo | null;
  createUserInfo: (userInfo: UserInfoInsert) => Promise<UserInfo | null>;
  updateUserInfo: (id: string, updates: UserInfoUpdate) => Promise<boolean>;
  deleteUserInfo: (id: string) => Promise<boolean>;
  getUserInfoById: (id: string) => Promise<UserInfo | null>;
  getAllUserInfo: () => Promise<UserInfo[]>;
  cleanupDuplicateRecords: () => Promise<boolean>;
  ensureUserInfoExists: () => Promise<UserInfo | null>;
}

const UserInfoContext = createContext<UserInfoContextProps | undefined>(undefined);

/**
 * UserInfoProvider component that manages user info state and provides user info-related functions
 */
export function UserInfoProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { user } = useAuthContext();
  
  // Use ref to avoid closure issues in real-time handlers
  const userRef = useRef(user);
  
  // Update ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) {
        setUserInfo(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("user_info")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          // If user_info doesn't exist, create it with default values
          if (error.code === "PGRST116") {
            console.log("UserInfoContext - Creating user_info for new user:", user.id);
            
            // First, double-check that no record exists to prevent race conditions
            const { data: existingCheck } = await supabase
              .from("user_info")
              .select("*")
              .eq("user_id", user.id)
              .limit(1);

            if (existingCheck && existingCheck.length > 0) {
              console.log("UserInfoContext - Found existing record during race condition check");
              setUserInfo(existingCheck[0]);
              return;
            }

            // Use upsert to prevent duplicates
            const { data: newUserInfo, error: insertError } = await supabase
              .from("user_info")
              .upsert([{ 
                user_id: user.id,
                goal: null,
                height: null,
                initial_weight: null,
                expected_frequency_per_week: null,
                expected_workout_duration_per_day_in_mins: null,
                accessible_equipment: null,
                exercise_that_i_dont_like: null
              }], {
                onConflict: 'user_id',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (insertError) {
              console.error("UserInfoContext - Error creating user_info:", insertError);
              setUserInfo(null);
            } else {
              console.log("UserInfoContext - Created user_info:", newUserInfo);
              setUserInfo(newUserInfo);
            }
          } else {
            console.error("UserInfoContext - Error fetching user_info:", error);
            setUserInfo(null);
          }
        } else {
          // Fetched user info successfully
          setUserInfo(data);
        }
      } catch (error) {
        console.error("UserInfoContext - Exception fetching user_info:", error);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();

    // Set up real-time subscription for user info changes
    let subscription: any = null;
    
    if (user) {
      const channelName = `user-info-${user.id}`;
      const handleRealtimeChange = (payload: any) => {
        if (payload.eventType === "UPDATE" && payload.new) {
          setUserInfo(payload.new as UserInfo);
        } else if (payload.eventType === "INSERT" && payload.new) {
          setUserInfo(payload.new as UserInfo);
        }
      };

      subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { 
            event: "*", 
            schema: "public", 
            table: "user_info",
            filter: `user_id=eq.${user.id}`
          },
          handleRealtimeChange
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe().catch((error: any) => {
          console.error("UserInfoContext - Error unsubscribing:", error);
        });
      }
    };
  }, [user]);

  /**
   * Create user info
   */
  const createUserInfo = useCallback(async (userInfoData: UserInfoInsert): Promise<UserInfo | null> => {
    if (!user) {
      console.error("UserInfoContext - No user authenticated");
      return null;
    }

    try {
      const dataToInsert = {
        ...userInfoData,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("user_info")
        .insert([dataToInsert])
        .select()
        .single();

      if (error) {
        console.error("UserInfoContext - Error creating user_info:", error);
        return null;
      }

      console.log("UserInfoContext - Successfully created user_info:", data);
      return data;
    } catch (error) {
      console.error("UserInfoContext - Exception creating user_info:", error);
      return null;
    }
  }, [user]);

  /**
   * Update user info
   */
  const updateUserInfo = useCallback(async (id: string, updates: UserInfoUpdate): Promise<boolean> => {
    if (!user) {
      console.error("UserInfoContext - No user authenticated");
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_info")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only update their own info

      if (error) {
        console.error("UserInfoContext - Error updating user_info:", error);
        return false;
      }

      console.log("UserInfoContext - Successfully updated user_info:", id);
      return true;
    } catch (error) {
      console.error("UserInfoContext - Exception updating user_info:", error);
      return false;
    }
  }, [user]);

  /**
   * Delete user info
   */
  const deleteUserInfo = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      console.error("UserInfoContext - No user authenticated");
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_info")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only delete their own info

      if (error) {
        console.error("UserInfoContext - Error deleting user_info:", error);
        return false;
      }

      console.log("UserInfoContext - Successfully deleted user_info:", id);
      return true;
    } catch (error) {
      console.error("UserInfoContext - Exception deleting user_info:", error);
      return false;
    }
  }, [user]);

  /**
   * Get user info by ID
   */
  const getUserInfoById = useCallback(async (id: string): Promise<UserInfo | null> => {
    try {
      const { data, error } = await supabase
        .from("user_info")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("UserInfoContext - Error fetching user_info:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("UserInfoContext - Exception fetching user_info:", error);
      return null;
    }
  }, []);

  /**
   * Get all user info (admin function)
   */
  const getAllUserInfo = useCallback(async (): Promise<UserInfo[]> => {
    try {
      const { data, error } = await supabase
        .from("user_info")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("UserInfoContext - Error fetching all user_info:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("UserInfoContext - Exception fetching all user_info:", error);
      return [];
    }
  }, []);

  /**
   * Clean up duplicate user_info records for the current user
   */
  const cleanupDuplicateRecords = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.error("UserInfoContext - No user authenticated");
      return false;
    }

    try {
      // Get all records for this user
      const { data: allRecords, error: fetchError } = await supabase
        .from("user_info")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("UserInfoContext - Error fetching user records:", fetchError);
        return false;
      }

      if (!allRecords || allRecords.length <= 1) {
        console.log("UserInfoContext - No duplicate records found");
        return true;
      }

      // Keep the first record (oldest), delete the rest
      const recordsToDelete = allRecords.slice(1);
      const keepRecord = allRecords[0];

      console.log(`UserInfoContext - Found ${allRecords.length} records, keeping ${keepRecord.id}, deleting ${recordsToDelete.length} duplicates`);

      // Delete duplicate records
      for (const record of recordsToDelete) {
        const { error: deleteError } = await supabase
          .from("user_info")
          .delete()
          .eq("id", record.id);

        if (deleteError) {
          console.error("UserInfoContext - Error deleting duplicate record:", deleteError);
        } else {
          console.log("UserInfoContext - Deleted duplicate record:", record.id);
        }
      }

      // Update the context with the kept record
      setUserInfo(keepRecord);
      return true;

    } catch (error) {
      console.error("UserInfoContext - Exception cleaning up duplicates:", error);
      return false;
    }
  }, [user]);

  /**
   * Force create a user_info record if none exists
   */
  const ensureUserInfoExists = useCallback(async (): Promise<UserInfo | null> => {
    if (!user) {
      console.error("UserInfoContext - No user authenticated");
      return null;
    }

    try {
      // First check if user_info already exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from("user_info")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("UserInfoContext - Error checking for existing user_info:", fetchError);
        return null;
      }

      if (existingRecord) {
        console.log("UserInfoContext - User info already exists:", existingRecord.id);
        setUserInfo(existingRecord);
        return existingRecord;
      }

      // Create new user_info record
      console.log("UserInfoContext - Creating new user_info for user:", user.id);
      const { data: newUserInfo, error: createError } = await supabase
        .from("user_info")
        .insert([{
          user_id: user.id,
          goal: null,
          height: null,
          initial_weight: null,
          expected_frequency_per_week: null,
          expected_workout_duration_per_day_in_mins: null,
          accessible_equipment: null,
          exercise_that_i_dont_like: null
        }])
        .select()
        .single();

      if (createError) {
        console.error("UserInfoContext - Error creating user_info:", createError);
        return null;
      }

      console.log("UserInfoContext - Successfully created user_info:", newUserInfo);
      setUserInfo(newUserInfo);
      return newUserInfo;

    } catch (error) {
      console.error("UserInfoContext - Exception ensuring user info exists:", error);
      return null;
    }
  }, [user]);

  const value: UserInfoContextProps = {
    loading,
    userInfo,
    createUserInfo,
    updateUserInfo,
    deleteUserInfo,
    getUserInfoById,
    getAllUserInfo,
    cleanupDuplicateRecords,
    ensureUserInfoExists,
  };

  return (
    <UserInfoContext.Provider value={value}>
      {children}
    </UserInfoContext.Provider>
  );
}

/**
 * Hook to use the UserInfoContext
 */
export function useUserInfoContext(): UserInfoContextProps {
  const context = useContext(UserInfoContext);
  if (context === undefined) {
    throw new Error("useUserInfoContext must be used within a UserInfoProvider");
  }
  return context;
}
