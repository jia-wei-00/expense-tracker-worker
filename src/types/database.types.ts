export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
