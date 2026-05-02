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
      egg_production: {
        Row: {
          client_uuid: string | null
          created_at: string
          damaged_eggs: number
          damaged_trays: number
          date: string
          eggs_per_tray: number
          farm_id: string
          id: string
          trays_collected: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          damaged_eggs?: number
          damaged_trays?: number
          date: string
          eggs_per_tray: number
          farm_id: string
          id?: string
          trays_collected: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          damaged_eggs?: number
          damaged_trays?: number
          date?: string
          eggs_per_tray?: number
          farm_id?: string
          id?: string
          trays_collected?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_production_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_production_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          date: string
          description: string | null
          farm_id: string
          id: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          payment_method: string | null
          recorded_by: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          date?: string
          description?: string | null
          farm_id: string
          id?: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          payment_method?: string | null
          recorded_by: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          date?: string
          description?: string | null
          farm_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["transaction_kind"]
          payment_method?: string | null
          recorded_by?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_transactions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          bird_capacity: number | null
          created_at: string
          description: string | null
          farm_type: string
          id: string
          is_active: boolean | null
          location_district: string
          location_parish: string | null
          location_subcounty: string | null
          location_village: string | null
          name: string
          owner_id: string
          size_acres: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          bird_capacity?: number | null
          created_at?: string
          description?: string | null
          farm_type: string
          id?: string
          is_active?: boolean | null
          location_district: string
          location_parish?: string | null
          location_subcounty?: string | null
          location_village?: string | null
          name: string
          owner_id: string
          size_acres?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          bird_capacity?: number | null
          created_at?: string
          description?: string | null
          farm_type?: string
          id?: string
          is_active?: boolean | null
          location_district?: string
          location_parish?: string | null
          location_subcounty?: string | null
          location_village?: string | null
          name?: string
          owner_id?: string
          size_acres?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_usage: {
        Row: {
          client_uuid: string | null
          created_at: string
          date: string
          farm_id: string
          feed_type: string
          id: string
          quantity_used_kg: number
          remaining_stock_kg: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          date: string
          farm_id: string
          feed_type: string
          id?: string
          quantity_used_kg: number
          remaining_stock_kg: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          date?: string
          farm_id?: string
          feed_type?: string
          id?: string
          quantity_used_kg?: number
          remaining_stock_kg?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_usage_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_usage_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string
          current_quantity: number
          farm_id: string
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          notes: string | null
          unit: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_quantity?: number
          farm_id: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          notes?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_quantity?: number
          farm_id?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          notes?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          date: string
          farm_id: string
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          quantity: number
          recorded_by: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          farm_id: string
          id?: string
          item_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          quantity: number
          recorded_by: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
          item_id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          quantity?: number
          recorded_by?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mortality: {
        Row: {
          age_weeks: number
          client_uuid: string | null
          created_at: string
          date: string
          farm_id: string
          id: string
          number_dead: number
          suspected_cause: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          age_weeks: number
          client_uuid?: string | null
          created_at?: string
          date: string
          farm_id: string
          id?: string
          number_dead: number
          suspected_cause: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          age_weeks?: number
          client_uuid?: string | null
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
          number_dead?: number
          suspected_cause?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortality_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          nin: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id: string
          nin?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          nin?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccination: {
        Row: {
          administered_by: string
          birds_vaccinated: number
          client_uuid: string | null
          created_at: string
          date: string
          farm_id: string
          id: string
          updated_at: string
          vaccine_name: string
          worker_id: string
        }
        Insert: {
          administered_by: string
          birds_vaccinated: number
          client_uuid?: string | null
          created_at?: string
          date: string
          farm_id: string
          id?: string
          updated_at?: string
          vaccine_name: string
          worker_id: string
        }
        Update: {
          administered_by?: string
          birds_vaccinated?: number
          client_uuid?: string | null
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
          updated_at?: string
          vaccine_name?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_notes: {
        Row: {
          client_uuid: string | null
          created_at: string
          date: string
          farm_id: string
          id: string
          notes: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          date: string
          farm_id: string
          id?: string
          notes: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
          notes?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_notes_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_notes_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          age: number
          auto_generated_password: string | null
          auto_generated_username: string | null
          contact_address: string | null
          contact_phone: string | null
          created_at: string
          date_of_birth: string | null
          farm_id: string
          full_name: string
          gender: string
          house_assignment: string | null
          id: string
          is_active: boolean | null
          is_also_accountant: boolean
          manager_id: string | null
          monthly_salary: number | null
          next_of_kin_name: string
          next_of_kin_phone: string
          next_of_kin_relationship: string
          nin: string | null
          role: Database["public"]["Enums"]["worker_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          auto_generated_password?: string | null
          auto_generated_username?: string | null
          contact_address?: string | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          farm_id: string
          full_name: string
          gender: string
          house_assignment?: string | null
          id?: string
          is_active?: boolean | null
          is_also_accountant?: boolean
          manager_id?: string | null
          monthly_salary?: number | null
          next_of_kin_name: string
          next_of_kin_phone: string
          next_of_kin_relationship: string
          nin?: string | null
          role?: Database["public"]["Enums"]["worker_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          auto_generated_password?: string | null
          auto_generated_username?: string | null
          contact_address?: string | null
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          farm_id?: string
          full_name?: string
          gender?: string
          house_assignment?: string | null
          id?: string
          is_active?: boolean | null
          is_also_accountant?: boolean
          manager_id?: string | null
          monthly_salary?: number | null
          next_of_kin_name?: string
          next_of_kin_phone?: string
          next_of_kin_relationship?: string
          nin?: string | null
          role?: Database["public"]["Enums"]["worker_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_farm_role: {
        Args: { _farm_id: string; _user_id: string }
        Returns: string
      }
      get_worker_farm_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_farm_accountant: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      is_farm_finance_staff: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      is_worker_on_farm: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_farm: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "caretaker"
        | "manager"
        | "assistant_manager"
        | "accountant"
        | "worker"
      inventory_category:
        | "feed"
        | "vaccine"
        | "medicine"
        | "equipment"
        | "other"
      inventory_movement_type: "received" | "used" | "adjusted" | "lost"
      transaction_category:
        | "egg_sales"
        | "bird_sales"
        | "manure_sales"
        | "other_income"
        | "feed"
        | "medicine"
        | "vaccines"
        | "utilities"
        | "repairs"
        | "transport"
        | "salaries"
        | "equipment"
        | "other_expense"
        | "mortality_loss"
        | "theft"
        | "damage"
        | "other_loss"
      transaction_kind: "income" | "expense" | "loss"
      worker_role:
        | "caretaker"
        | "manager"
        | "assistant_manager"
        | "accountant"
        | "worker"
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
    Enums: {
      app_role: [
        "owner",
        "caretaker",
        "manager",
        "assistant_manager",
        "accountant",
        "worker",
      ],
      inventory_category: ["feed", "vaccine", "medicine", "equipment", "other"],
      inventory_movement_type: ["received", "used", "adjusted", "lost"],
      transaction_category: [
        "egg_sales",
        "bird_sales",
        "manure_sales",
        "other_income",
        "feed",
        "medicine",
        "vaccines",
        "utilities",
        "repairs",
        "transport",
        "salaries",
        "equipment",
        "other_expense",
        "mortality_loss",
        "theft",
        "damage",
        "other_loss",
      ],
      transaction_kind: ["income", "expense", "loss"],
      worker_role: [
        "caretaker",
        "manager",
        "assistant_manager",
        "accountant",
        "worker",
      ],
    },
  },
} as const
