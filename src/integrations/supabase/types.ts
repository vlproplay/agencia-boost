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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cadence_tasks: {
        Row: {
          action: string
          created_at: string
          day_offset: number
          done: boolean
          done_at: string | null
          due_date: string
          id: string
          lead_id: string
          outcome: string | null
        }
        Insert: {
          action: string
          created_at?: string
          day_offset: number
          done?: boolean
          done_at?: string | null
          due_date: string
          id?: string
          lead_id: string
          outcome?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          day_offset?: number
          done?: boolean
          done_at?: string | null
          due_date?: string
          id?: string
          lead_id?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadence_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          ad_spend: number
          id: string
          mrr_goal: number
          revenue_goal: number
          sales_goal: number
          updated_at: string
        }
        Insert: {
          ad_spend?: number
          id?: string
          mrr_goal?: number
          revenue_goal?: number
          sales_goal?: number
          updated_at?: string
        }
        Update: {
          ad_spend?: number
          id?: string
          mrr_goal?: number
          revenue_goal?: number
          sales_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          bant: string | null
          bant_authority: string | null
          bant_budget: string | null
          bant_need: string | null
          bant_timeline: string | null
          cadence_day: number | null
          cadence_status: string | null
          call_at: string | null
          call_notes: string | null
          closer: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          first_contact_at: string | null
          id: string
          invests_traffic: string | null
          is_mql: boolean
          lost_reason: string | null
          market_time: string | null
          mql_at: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          plan: string | null
          proposal_plan: string | null
          proposal_value: number | null
          revenue: string | null
          sale_value: number | null
          segment: string | null
          source: string | null
          stage: string
          stage_changed_at: string
          updated_at: string
        }
        Insert: {
          bant?: string | null
          bant_authority?: string | null
          bant_budget?: string | null
          bant_need?: string | null
          bant_timeline?: string | null
          cadence_day?: number | null
          cadence_status?: string | null
          call_at?: string | null
          call_notes?: string | null
          closer?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          first_contact_at?: string | null
          id?: string
          invests_traffic?: string | null
          is_mql?: boolean
          lost_reason?: string | null
          market_time?: string | null
          mql_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          plan?: string | null
          proposal_plan?: string | null
          proposal_value?: number | null
          revenue?: string | null
          sale_value?: number | null
          segment?: string | null
          source?: string | null
          stage?: string
          stage_changed_at?: string
          updated_at?: string
        }
        Update: {
          bant?: string | null
          bant_authority?: string | null
          bant_budget?: string | null
          bant_need?: string | null
          bant_timeline?: string | null
          cadence_day?: number | null
          cadence_status?: string | null
          call_at?: string | null
          call_notes?: string | null
          closer?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          first_contact_at?: string | null
          id?: string
          invests_traffic?: string | null
          is_mql?: boolean
          lost_reason?: string | null
          market_time?: string | null
          mql_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          plan?: string | null
          proposal_plan?: string | null
          proposal_value?: number | null
          revenue?: string | null
          sale_value?: number | null
          segment?: string | null
          source?: string | null
          stage?: string
          stage_changed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
