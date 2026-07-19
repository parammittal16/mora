export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          handle: string;
          name: string | null;
          headline: string | null;
          bio: string | null;
          avatar_url: string | null;
          goal: string | null;
          theme: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          handle: string;
          name?: string | null;
          headline?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          goal?: string | null;
          theme?: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          handle?: string;
          name?: string | null;
          headline?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          goal?: string | null;
          theme?: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolio_items: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          title: string;
          description: string | null;
          evidence_text: string | null;
          image_url: string | null;
          external_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: string;
          title: string;
          description?: string | null;
          evidence_text?: string | null;
          image_url?: string | null;
          external_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: string;
          title?: string;
          description?: string | null;
          evidence_text?: string | null;
          image_url?: string | null;
          external_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_blueprints: {
        Row: {
          id: string;
          profile_id: string;
          blueprint_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          blueprint_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          blueprint_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_blueprints_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PortfolioItem =
  Database["public"]["Tables"]["portfolio_items"]["Row"];
export type PortfolioBlueprint =
  Database["public"]["Tables"]["portfolio_blueprints"]["Row"];
