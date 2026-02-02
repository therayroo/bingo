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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bingo_cards: {
        Row: {
          color: string | null
          created_at: string
          grid: Json
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          grid: Json
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          grid?: Json
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bingo_cards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_draws: {
        Row: {
          drawn_at: string
          drawn_by: string
          id: string
          number: number
          session_id: string
        }
        Insert: {
          drawn_at?: string
          drawn_by: string
          id?: string
          number: number
          session_id: string
        }
        Update: {
          drawn_at?: string
          drawn_by?: string
          id?: string
          number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bingo_draws_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_players: {
        Row: {
          created_at: string
          id: string
          nickname: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nickname: string
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bingo_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_session_transitions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          new_session_id: string
          old_session_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          new_session_id: string
          old_session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          new_session_id?: string
          old_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bingo_session_transitions_new_session_id_fkey"
            columns: ["new_session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_transitions_old_session_id_fkey"
            columns: ["old_session_id"]
            isOneToOne: true
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_sessions: {
        Row: {
          code: string
          created_at: string
          gm_user_id: string
          id: string
          state: string
          title: string
          winning_rules: Json | null
        }
        Insert: {
          code: string
          created_at?: string
          gm_user_id: string
          id?: string
          state?: string
          title: string
          winning_rules?: Json | null
        }
        Update: {
          code?: string
          created_at?: string
          gm_user_id?: string
          id?: string
          state?: string
          title?: string
          winning_rules?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_bingo_session: {
        Args: { p_title: string }
        Returns: {
          code: string
          session_id: string
          state: string
        }[]
      }
      create_my_card: {
        Args: { p_code: string }
        Returns: {
          card_id: string
        }[]
      }
      draw_random_number: {
        Args: { p_code: string }
        Returns: {
          drawn_at: string
          number: number
        }[]
      }
      end_bingo_session: { Args: { p_code: string }; Returns: undefined }
      gen_bingo_join_code: { Args: never; Returns: string }
      generate_bingo_grid: { Args: never; Returns: Json }
      is_bingo_gm: { Args: { p_session_id: string }; Returns: boolean }
      is_bingo_member: { Args: { p_session_id: string }; Returns: boolean }
      join_bingo_session: {
        Args: { p_code: string; p_nickname: string }
        Returns: {
          role: string
          session_code: string
          session_id: string
          state: string
        }[]
      }
      start_next_session: {
        Args: { p_new_title: string; p_old_code: string }
        Returns: {
          new_code: string
          new_session_id: string
        }[]
      }
      update_winning_rules: {
        Args: { p_code: string; p_rules: Json }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
