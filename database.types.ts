export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      exercise: {
        Row: {
          created_at: string
          done: boolean | null
          estimated_duration: number | null
          id: string
          load_kg: number | null
          name: string | null
          order_index: number | null
          reps: number | null
          rest_sec: number | null
          rir: number | null
          sets: number | null
          weight_note: string | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          done?: boolean | null
          estimated_duration?: number | null
          id?: string
          load_kg?: number | null
          name?: string | null
          order_index?: number | null
          reps?: number | null
          rest_sec?: number | null
          rir?: number | null
          sets?: number | null
          weight_note?: string | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          done?: boolean | null
          estimated_duration?: number | null
          id?: string
          load_kg?: number | null
          name?: string | null
          order_index?: number | null
          reps?: number | null
          rest_sec?: number | null
          rir?: number | null
          sets?: number | null
          weight_note?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_runs: {
        Row: {
          created_at: string
          error_text: string | null
          horizon_days: number
          id: string
          input_hash: string | null
          plan_meta: Json | null
          start_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_text?: string | null
          horizon_days: number
          id?: string
          input_hash?: string | null
          plan_meta?: Json | null
          start_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_text?: string | null
          horizon_days?: number
          id?: string
          input_hash?: string | null
          plan_meta?: Json | null
          start_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          date: string
          id: string
          intensity: string | null
          label: string
          notes: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          intensity?: string | null
          label: string
          notes?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          intensity?: string | null
          label?: string
          notes?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_info: {
        Row: {
          accessible_equipment: string | null
          conditioning_intensity: string | null
          created_at: string
          exercise_modalities: string[] | null
          exercise_that_i_dont_like: string | null
          expected_frequency_per_week: number | null
          expected_workout_duration_per_day_in_mins: number | null
          goal: string | null
          height: number | null
          id: string
          initial_weight: number | null
          user_id: string
        }
        Insert: {
          accessible_equipment?: string | null
          conditioning_intensity?: string | null
          created_at?: string
          exercise_modalities?: string[] | null
          exercise_that_i_dont_like?: string | null
          expected_frequency_per_week?: number | null
          expected_workout_duration_per_day_in_mins?: number | null
          goal?: string | null
          height?: number | null
          id?: string
          initial_weight?: number | null
          user_id: string
        }
        Update: {
          accessible_equipment?: string | null
          conditioning_intensity?: string | null
          created_at?: string
          exercise_modalities?: string[] | null
          exercise_that_i_dont_like?: string | null
          expected_frequency_per_week?: number | null
          expected_workout_duration_per_day_in_mins?: number | null
          goal?: string | null
          height?: number | null
          id?: string
          initial_weight?: number | null
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          action: string | null
          created_at: string
          date: string | null
          event_id: string | null
          feedback: string | null
          focus: string | null
          id: string
          plan_meta: Json | null
          state: string | null
          tags: string[] | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          date?: string | null
          event_id?: string | null
          feedback?: string | null
          focus?: string | null
          id?: string
          plan_meta?: Json | null
          state?: string | null
          tags?: string[] | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          action?: string | null
          created_at?: string
          date?: string | null
          event_id?: string | null
          feedback?: string | null
          focus?: string | null
          id?: string
          plan_meta?: Json | null
          state?: string | null
          tags?: string[] | null
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "user_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      plan_or_get_workout: {
        Args: { p_date: string; p_exercises: Json; p_focus: string }
        Returns: {
          action: string | null
          created_at: string
          date: string | null
          event_id: string | null
          feedback: string | null
          focus: string | null
          id: string
          plan_meta: Json | null
          state: string | null
          tags: string[] | null
          user_id: string | null
          weight: number | null
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
