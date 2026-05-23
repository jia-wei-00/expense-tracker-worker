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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      expense: {
        Row: {
          amount: number | null
          category: number | null
          created_at: string
          id: number
          is_expense: boolean | null
          name: string | null
          spend_date: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: number | null
          created_at?: string
          id?: number
          is_expense?: boolean | null
          name?: string | null
          spend_date?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: number | null
          created_at?: string
          id?: number
          is_expense?: boolean | null
          name?: string | null
          spend_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "expense_category"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_category: {
        Row: {
          created_at: string
          id: number
          is_expense: boolean | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_expense?: boolean | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_expense?: boolean | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      loan: {
        Row: {
          created_at: string
          id: number
          interest_rate: number | null
          name: string | null
          total_amount: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          interest_rate?: number | null
          name?: string | null
          total_amount?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          interest_rate?: number | null
          name?: string | null
          total_amount?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      loan_record: {
        Row: {
          amount: string | null
          created_at: string
          id: number
          loan: number | null
          pay_date: string | null
          user_id: string | null
        }
        Insert: {
          amount?: string | null
          created_at?: string
          id?: number
          loan?: number | null
          pay_date?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: string | null
          created_at?: string
          id?: number
          loan?: number | null
          pay_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_record_loan_fkey"
            columns: ["loan"]
            isOneToOne: false
            referencedRelation: "loan"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pending_actions: {
        Row: {
          args: Json
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          tool_name: string
        }
        Insert: {
          args: Json
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number: string
          tool_name: string
        }
        Update: {
          args?: Json
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          tool_name?: string
        }
        Relationships: []
      }
      whatsapp_users: {
        Row: {
          created_at: string | null
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_expense_stats: {
        Args: { p_month?: number; p_user_id: string; p_year?: number }
        Returns: {
          balance: number
          total_expenses: number
          total_income: number
        }[]
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
