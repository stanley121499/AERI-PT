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

export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutInsert = Database["public"]["Tables"]["workouts"]["Insert"];
export type WorkoutUpdate = Database["public"]["Tables"]["workouts"]["Update"];

interface WorkoutContextProps {
  loading: boolean;
  workouts: Workout[];
  createWorkout: (workout: WorkoutInsert) => Promise<Workout | null>;
  updateWorkout: (id: string, updates: WorkoutUpdate) => Promise<boolean>;
  deleteWorkout: (id: string) => Promise<boolean>;
  getWorkoutById: (id: string) => Promise<Workout | null>;
  getUserWorkouts: (userId?: string) => Promise<Workout[]>;
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(undefined);

/**
 * WorkoutProvider component that manages workout state and provides workout-related functions
 */
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const { user } = useAuthContext();
  
  // Use ref to avoid closure issues in real-time handlers
  const userRef = useRef(user);
  
  // Update ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user) {
        setWorkouts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("WorkoutContext - Error fetching workouts:", error);
          setWorkouts([]);
        } else {
          setWorkouts(data || []);
        }
      } catch (error) {
        console.error("WorkoutContext - Exception fetching workouts:", error);
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();

    // Set up real-time subscription for workout changes
    let subscription: any = null;
    
    if (user) {
      const channelName = `workouts-${user.id}`;
      const handleRealtimeChange = (payload: any) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setWorkouts(prev => [payload.new as Workout, ...prev]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          setWorkouts(prev => 
            prev.map(workout => 
              workout.id === payload.new.id ? payload.new as Workout : workout
            )
          );
        } else if (payload.eventType === "DELETE" && payload.old) {
          setWorkouts(prev => 
            prev.filter(workout => workout.id !== payload.old.id)
          );
        }
      };

      subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { 
            event: "*", 
            schema: "public", 
            table: "workouts",
            filter: `user_id=eq.${user.id}`
          },
          handleRealtimeChange
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe().catch((error: any) => {
          console.error("WorkoutContext - Error unsubscribing:", error);
        });
      }
    };
  }, [user]);

  /**
   * Create a new workout
   */
  const createWorkout = useCallback(async (workout: WorkoutInsert): Promise<Workout | null> => {
    if (!user) {
      console.error("WorkoutContext - No user authenticated");
      return null;
    }

    try {
      const workoutData = {
        ...workout,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("workouts")
        .insert([workoutData])
        .select()
        .single();

      if (error) {
        console.error("WorkoutContext - Error creating workout:", error);
        return null;
      }

      console.log("WorkoutContext - Successfully created workout:", data);
      return data;
    } catch (error) {
      console.error("WorkoutContext - Exception creating workout:", error);
      return null;
    }
  }, [user]);

  /**
   * Update an existing workout
   */
  const updateWorkout = useCallback(async (id: string, updates: WorkoutUpdate): Promise<boolean> => {
    if (!user) {
      console.error("WorkoutContext - No user authenticated");
      return false;
    }

    try {
      const { error } = await supabase
        .from("workouts")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only update their own workouts

      if (error) {
        console.error("WorkoutContext - Error updating workout:", error);
        return false;
      }

      console.log("WorkoutContext - Successfully updated workout:", id);
      return true;
    } catch (error) {
      console.error("WorkoutContext - Exception updating workout:", error);
      return false;
    }
  }, [user]);

  /**
   * Delete a workout
   */
  const deleteWorkout = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      console.error("WorkoutContext - No user authenticated");
      return false;
    }

    try {
      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only delete their own workouts

      if (error) {
        console.error("WorkoutContext - Error deleting workout:", error);
        return false;
      }

      console.log("WorkoutContext - Successfully deleted workout:", id);
      return true;
    } catch (error) {
      console.error("WorkoutContext - Exception deleting workout:", error);
      return false;
    }
  }, [user]);

  /**
   * Get a specific workout by ID
   */
  const getWorkoutById = useCallback(async (id: string): Promise<Workout | null> => {
    if (!user) {
      console.error("WorkoutContext - No user authenticated");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("WorkoutContext - Error fetching workout:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("WorkoutContext - Exception fetching workout:", error);
      return null;
    }
  }, [user]);

  /**
   * Get workouts for a specific user (admin function)
   */
  const getUserWorkouts = useCallback(async (userId?: string): Promise<Workout[]> => {
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId || user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("WorkoutContext - Error fetching user workouts:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("WorkoutContext - Exception fetching user workouts:", error);
      return [];
    }
  }, [user]);

  const value: WorkoutContextProps = {
    loading,
    workouts,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutById,
    getUserWorkouts,
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}

/**
 * Hook to use the WorkoutContext
 */
export function useWorkoutContext(): WorkoutContextProps {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }
  return context;
}
