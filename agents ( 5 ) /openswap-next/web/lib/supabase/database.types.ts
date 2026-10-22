// Table types for supabase/schema.sql, in the shape `supabase gen types typescript` writes.
// Written by hand until the new Supabase project exists. Regenerate it then with the Supabase tool.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; preferences: string; updated_at: string };
        Insert: { id: string; preferences?: string; updated_at?: string };
        Update: { id?: string; preferences?: string; updated_at?: string };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          chat_history: Json;
          context_history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string;
          title: string;
          chat_history?: Json;
          context_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          chat_history?: Json;
          context_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
