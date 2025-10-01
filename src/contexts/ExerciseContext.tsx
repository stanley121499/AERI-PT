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

export type Exercise = Database["public"]["Tables"]["exercise"]["Row"];
export type ExerciseInsert = Database["public"]["Tables"]["exercise"]["Insert"];
export type ExerciseUpdate = Database["public"]["Tables"]["exercise"]["Update"];

interface ExerciseContextProps {
  loading: boolean;
  exercises: Exercise[];
  createExercise: (exercise: ExerciseInsert) => Promise<Exercise | null>;
  updateExercise: (id: string, updates: ExerciseUpdate) => Promise<boolean>;
  deleteExercise: (id: string) => Promise<boolean>;
  getExerciseById: (id: string) => Promise<Exercise | null>;
  getExercisesByWorkout: (workoutId: string) => Promise<Exercise[]>;
  markExerciseAsDone: (id: string, done: boolean) => Promise<boolean>;
}

const ExerciseContext = createContext<ExerciseContextProps | undefined>(undefined);
/**
 * ExerciseProvider component that manages exercise state and provides exercise-related functions
 */
export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { user } = useAuthContext();
  
  // Use ref to avoid closure issues in real-time handlers
  const userRef = useRef(user);
  
  // Update ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!user) {
        setExercises([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get exercises through workouts (since exercises are linked to workouts)
        const { data, error } = await supabase
          .from("exercise")
          .select(`
            *,
            workouts!inner(user_id)
          `)
          .eq("workouts.user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("ExerciseContext - Error fetching exercises:", error);
          setExercises([]);
        } else {
          setExercises(data || []);
        }
      } catch (error) {
        console.error("ExerciseContext - Exception fetching exercises:", error);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();

    // Set up real-time subscription for exercise changes
    let subscription: any = null;
    
    if (user) {
      const channelName = `exercises-${user.id}`;
      const handleRealtimeChange = (payload: any) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setExercises(prev => [payload.new as Exercise, ...prev]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          setExercises(prev => 
            prev.map(exercise => 
              exercise.id === payload.new.id ? payload.new as Exercise : exercise
            )
          );
        } else if (payload.eventType === "DELETE" && payload.old) {
          setExercises(prev => 
            prev.filter(exercise => exercise.id !== payload.old.id)
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
            table: "exercise"
          },
          handleRealtimeChange
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe().catch((error: any) => {
          console.error("ExerciseContext - Error unsubscribing:", error);
        });
      }
    };
  }, [user]);

  /**
   * Create a new exercise
   */
  const createExercise = useCallback(async (exercise: ExerciseInsert): Promise<Exercise | null> => {
    if (!user) {
      console.error("ExerciseContext - No user authenticated");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("exercise")
        .insert([exercise])
        .select()
        .single();

      if (error) {
        console.error("ExerciseContext - Error creating exercise:", error);
        return null;
      }

      console.log("ExerciseContext - Successfully created exercise:", data);
      return data;
    } catch (error) {
      console.error("ExerciseContext - Exception creating exercise:", error);
      return null;
    }
  }, [user]);

  /**
   * Update an existing exercise
   */
  const updateExercise = useCallback(async (id: string, updates: ExerciseUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("exercise")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("ExerciseContext - Error updating exercise:", error);
        return false;
      }

      console.log("ExerciseContext - Successfully updated exercise:", id);
      return true;
    } catch (error) {
      console.error("ExerciseContext - Exception updating exercise:", error);
      return false;
    }
  }, []);

  /**
   * Delete an exercise
   */
  const deleteExercise = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("exercise")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("ExerciseContext - Error deleting exercise:", error);
        return false;
      }

      console.log("ExerciseContext - Successfully deleted exercise:", id);
      return true;
    } catch (error) {
      console.error("ExerciseContext - Exception deleting exercise:", error);
      return false;
    }
  }, []);

  /**
   * Get a specific exercise by ID
   */
  const getExerciseById = useCallback(async (id: string): Promise<Exercise | null> => {
    try {
      const { data, error } = await supabase
        .from("exercise")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("ExerciseContext - Error fetching exercise:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("ExerciseContext - Exception fetching exercise:", error);
      return null;
    }
  }, []);

  /**
   * Get exercises for a specific workout
   */
  const getExercisesByWorkout = useCallback(async (workoutId: string): Promise<Exercise[]> => {
    try {
      const { data, error } = await supabase
        .from("exercise")
        .select("*")
        .eq("workout_id", workoutId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("ExerciseContext - Error fetching exercises by workout:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("ExerciseContext - Exception fetching exercises by workout:", error);
      return [];
    }
  }, []);

  /**
   * Mark an exercise as done or not done
   */
  const markExerciseAsDone = useCallback(async (id: string, done: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("exercise")
        .update({ done })
        .eq("id", id);

      if (error) {
        console.error("ExerciseContext - Error marking exercise as done:", error);
        return false;
      }

      console.log("ExerciseContext - Successfully marked exercise as done:", id, done);
      return true;
    } catch (error) {
      console.error("ExerciseContext - Exception marking exercise as done:", error);
      return false;
    }
  }, []);

  const value: ExerciseContextProps = {
    loading,
    exercises,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    getExercisesByWorkout,
    markExerciseAsDone,
  };

  return (
    <ExerciseContext.Provider value={value}>
      {children}
    </ExerciseContext.Provider>
  );
}

/**
 * Hook to use the ExerciseContext
 */
export function useExerciseContext(): ExerciseContextProps {
  const context = useContext(ExerciseContext);
  if (context === undefined) {
    throw new Error("useExerciseContext must be used within an ExerciseProvider");
  }
  return context;
}
