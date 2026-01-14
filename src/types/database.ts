export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          game_system: string
          description: string | null
          image_url: string | null
          status: 'active' | 'completed' | 'hiatus' | 'archived'
          last_intelligence_run: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          game_system?: string
          description?: string | null
          image_url?: string | null
          status?: 'active' | 'completed' | 'hiatus' | 'archived'
          last_intelligence_run?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          game_system?: string
          description?: string | null
          image_url?: string | null
          status?: 'active' | 'completed' | 'hiatus' | 'archived'
          last_intelligence_run?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          campaign_id: string
          name: string
          type: 'pc' | 'npc'
          description: string | null
          summary: string | null
          notes: string | null
          image_url: string | null
          detail_image_url: string | null
          image_generated_with_ai: boolean
          position_x: number
          position_y: number
          canvas_width: number | null
          canvas_height: number | null
          // Status fields
          status: string | null
          status_color: string | null
          // PC fields
          race: string | null
          class: string | null
          age: number | null
          background: string | null
          appearance: string | null
          personality: string | null
          goals: string | null
          secrets: string | null
          // NPC fields
          role: string | null
          // List fields (JSONB)
          important_people: Json | null
          story_hooks: Json | null
          quotes: Json | null
          // Import tracking
          source_document: string | null
          imported_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          type?: 'pc' | 'npc'
          description?: string | null
          summary?: string | null
          notes?: string | null
          image_url?: string | null
          detail_image_url?: string | null
          image_generated_with_ai?: boolean
          position_x?: number
          position_y?: number
          canvas_width?: number | null
          canvas_height?: number | null
          status?: string | null
          status_color?: string | null
          race?: string | null
          class?: string | null
          age?: number | null
          background?: string | null
          appearance?: string | null
          personality?: string | null
          goals?: string | null
          secrets?: string | null
          role?: string | null
          important_people?: Json | null
          story_hooks?: Json | null
          quotes?: Json | null
          source_document?: string | null
          imported_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          type?: 'pc' | 'npc'
          description?: string | null
          summary?: string | null
          notes?: string | null
          image_url?: string | null
          detail_image_url?: string | null
          image_generated_with_ai?: boolean
          position_x?: number
          position_y?: number
          canvas_width?: number | null
          canvas_height?: number | null
          status?: string | null
          status_color?: string | null
          race?: string | null
          class?: string | null
          age?: number | null
          background?: string | null
          appearance?: string | null
          personality?: string | null
          goals?: string | null
          secrets?: string | null
          role?: string | null
          important_people?: Json | null
          story_hooks?: Json | null
          quotes?: Json | null
          source_document?: string | null
          imported_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          campaign_id: string
          name: string
          color: string
          icon: string | null
          tag_type: 'categorical' | 'relational'
          category: 'general' | 'faction' | 'relationship'
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          color?: string
          icon?: string | null
          tag_type?: 'categorical' | 'relational'
          category?: 'general' | 'faction' | 'relationship'
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          color?: string
          icon?: string | null
          tag_type?: 'categorical' | 'relational'
          category?: 'general' | 'faction' | 'relationship'
          created_at?: string
        }
      }
      character_tags: {
        Row: {
          id: string
          character_id: string
          tag_id: string
          related_character_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          tag_id: string
          related_character_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          tag_id?: string
          related_character_id?: string | null
          created_at?: string
        }
      }
      canvas_groups: {
        Row: {
          id: string
          campaign_id: string
          name: string
          position_x: number
          position_y: number
          width: number
          height: number
          color: string | null
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          color?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          color?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          campaign_id: string
          session_number: number
          title: string | null
          date: string
          notes: string | null
          summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          session_number: number
          title?: string | null
          date?: string
          notes?: string | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          session_number?: number
          title?: string | null
          date?: string
          notes?: string | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      session_characters: {
        Row: {
          id: string
          session_id: string
          character_id: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          character_id: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          character_id?: string
          created_at?: string
        }
      }
      timeline_events: {
        Row: {
          id: string
          campaign_id: string
          session_id: string | null
          event_type: 'plot' | 'character_intro' | 'character_death' | 'location' | 'combat' | 'revelation' | 'quest_start' | 'quest_end' | 'session' | 'discovery' | 'quest_complete' | 'death' | 'romance' | 'alliance' | 'other'
          title: string
          description: string | null
          event_date: string
          character_id: string | null
          character_ids: string[] | null
          event_order: number
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          session_id?: string | null
          event_type?: 'plot' | 'character_intro' | 'character_death' | 'location' | 'combat' | 'revelation' | 'quest_start' | 'quest_end' | 'session' | 'discovery' | 'quest_complete' | 'death' | 'romance' | 'alliance' | 'other'
          title: string
          description?: string | null
          event_date?: string
          character_id?: string | null
          character_ids?: string[] | null
          event_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          session_id?: string | null
          event_type?: 'plot' | 'character_intro' | 'character_death' | 'location' | 'combat' | 'revelation' | 'quest_start' | 'quest_end' | 'session' | 'discovery' | 'quest_complete' | 'death' | 'romance' | 'alliance' | 'other'
          title?: string
          description?: string | null
          event_date?: string
          character_id?: string | null
          character_ids?: string[] | null
          event_order?: number
          created_at?: string
        }
      }
      world_maps: {
        Row: {
          id: string
          campaign_id: string
          image_url: string
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          image_url: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          image_url?: string
          name?: string | null
          created_at?: string
        }
      }
      media_gallery: {
        Row: {
          id: string
          campaign_id: string
          image_url: string
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          image_url: string
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          image_url?: string
          title?: string | null
          created_at?: string
        }
      }
      character_versions: {
        Row: {
          id: string
          character_id: string
          content_snapshot: Json
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          content_snapshot: Json
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          content_snapshot?: Json
          created_at?: string
        }
      }
      vault_characters: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'pc' | 'npc'
          description: string | null
          summary: string | null
          notes: string | null
          image_url: string | null
          detail_image_url: string | null
          tags: string[] | null
          status: string | null
          status_color: string | null
          race: string | null
          class: string | null
          background: string | null
          appearance: string | null
          personality: string | null
          goals: string | null
          secrets: string | null
          quotes: string[] | null
          common_phrases: string[] | null
          weaknesses: string[] | null
          plot_hooks: string[] | null
          tldr: string[] | null
          theme_music_url: string | null
          theme_music_title: string | null
          character_sheet_url: string | null
          game_system: string | null
          external_campaign: string | null
          dm_name: string | null
          campaign_started: string | null
          quick_stats: Json | null
          inventory: Json | null
          gold: number | null
          source_file: string | null
          imported_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: 'pc' | 'npc'
          description?: string | null
          summary?: string | null
          notes?: string | null
          image_url?: string | null
          detail_image_url?: string | null
          tags?: string[] | null
          status?: string | null
          status_color?: string | null
          race?: string | null
          class?: string | null
          background?: string | null
          appearance?: string | null
          personality?: string | null
          goals?: string | null
          secrets?: string | null
          quotes?: string[] | null
          common_phrases?: string[] | null
          weaknesses?: string[] | null
          plot_hooks?: string[] | null
          tldr?: string[] | null
          theme_music_url?: string | null
          theme_music_title?: string | null
          character_sheet_url?: string | null
          game_system?: string | null
          external_campaign?: string | null
          dm_name?: string | null
          campaign_started?: string | null
          quick_stats?: Json | null
          inventory?: Json | null
          gold?: number | null
          source_file?: string | null
          imported_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'pc' | 'npc'
          description?: string | null
          summary?: string | null
          notes?: string | null
          image_url?: string | null
          detail_image_url?: string | null
          tags?: string[] | null
          status?: string | null
          status_color?: string | null
          race?: string | null
          class?: string | null
          background?: string | null
          appearance?: string | null
          personality?: string | null
          goals?: string | null
          secrets?: string | null
          quotes?: string[] | null
          common_phrases?: string[] | null
          weaknesses?: string[] | null
          plot_hooks?: string[] | null
          tldr?: string[] | null
          theme_music_url?: string | null
          theme_music_title?: string | null
          character_sheet_url?: string | null
          game_system?: string | null
          external_campaign?: string | null
          dm_name?: string | null
          campaign_started?: string | null
          quick_stats?: Json | null
          inventory?: Json | null
          gold?: number | null
          source_file?: string | null
          imported_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      story_characters: {
        Row: {
          id: string
          character_id: string
          name: string
          relationship: string
          tagline: string | null
          notes: string | null
          image_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          character_id: string
          name: string
          relationship: string
          tagline?: string | null
          notes?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          name?: string
          relationship?: string
          tagline?: string | null
          notes?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      play_journal: {
        Row: {
          id: string
          character_id: string
          session_number: number | null
          session_date: string | null
          title: string | null
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          character_id: string
          session_number?: number | null
          session_date?: string | null
          title?: string | null
          notes: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          session_number?: number | null
          session_date?: string | null
          title?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      character_links: {
        Row: {
          id: string
          character_id: string
          link_type: string
          title: string
          url: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          character_id: string
          link_type: string
          title: string
          url: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          link_type?: string
          title?: string
          url?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      character_learned_facts: {
        Row: {
          id: string
          character_id: string
          about_name: string
          facts: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          character_id: string
          about_name: string
          facts?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          about_name?: string
          facts?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      character_mood_board: {
        Row: {
          id: string
          character_id: string
          image_url: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          image_url: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          image_url?: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      character_statuses: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          description: string | null
          sort_order: number
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          description?: string | null
          sort_order?: number
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          description?: string | null
          sort_order?: number
          is_default?: boolean
          created_at?: string
        }
      }
      character_shares: {
        Row: {
          id: string
          share_code: string
          character_id: string
          included_sections: Json
          expires_at: string | null
          view_count: number
          created_at: string
        }
        Insert: {
          id?: string
          share_code: string
          character_id: string
          included_sections: Json
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          share_code?: string
          character_id?: string
          included_sections?: Json
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
      }
      character_connections: {
        Row: {
          id: string
          character_id: string
          connected_character_id: string
          connection_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          connected_character_id: string
          connection_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          connected_character_id?: string
          connection_notes?: string | null
          created_at?: string
        }
      }
      oneshot_genre_tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          sort_order?: number
          created_at?: string
        }
      }
      oneshots: {
        Row: {
          id: string
          user_id: string
          title: string
          tagline: string | null
          image_url: string | null
          genre_tag_ids: string[] | null
          game_system: string
          level: number | null
          player_count_min: number
          player_count_max: number
          estimated_duration: string | null
          introduction: string | null
          setting_notes: string | null
          character_creation: string | null
          session_plan: string | null
          twists: string | null
          key_npcs: string | null
          handouts: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          tagline?: string | null
          image_url?: string | null
          genre_tag_ids?: string[] | null
          game_system?: string
          level?: number | null
          player_count_min?: number
          player_count_max?: number
          estimated_duration?: string | null
          introduction?: string | null
          setting_notes?: string | null
          character_creation?: string | null
          session_plan?: string | null
          twists?: string | null
          key_npcs?: string | null
          handouts?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          tagline?: string | null
          image_url?: string | null
          genre_tag_ids?: string[] | null
          game_system?: string
          level?: number | null
          player_count_min?: number
          player_count_max?: number
          estimated_duration?: string | null
          introduction?: string | null
          setting_notes?: string | null
          character_creation?: string | null
          session_plan?: string | null
          twists?: string | null
          key_npcs?: string | null
          handouts?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      oneshot_runs: {
        Row: {
          id: string
          oneshot_id: string
          run_date: string
          group_name: string | null
          player_count: number | null
          notes: string | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          oneshot_id: string
          run_date?: string
          group_name?: string | null
          player_count?: number | null
          notes?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          oneshot_id?: string
          run_date?: string
          group_name?: string | null
          player_count?: number | null
          notes?: string | null
          rating?: number | null
          created_at?: string
        }
      }
      oneshot_shares: {
        Row: {
          id: string
          share_code: string
          oneshot_id: string
          included_sections: Json
          expires_at: string | null
          view_count: number
          created_at: string
        }
        Insert: {
          id?: string
          share_code: string
          oneshot_id: string
          included_sections: Json
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          share_code?: string
          oneshot_id?: string
          included_sections?: Json
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          ai_provider: 'anthropic' | 'google'
          theme: 'dark' | 'light' | 'system'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          ai_provider?: 'anthropic' | 'google'
          theme?: 'dark' | 'light' | 'system'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          ai_provider?: 'anthropic' | 'google'
          theme?: 'dark' | 'light' | 'system'
          created_at?: string
          updated_at?: string
        }
      }
      character_relationships: {
        Row: {
          id: string
          campaign_id: string
          character_id: string
          related_character_id: string
          relationship_type: string
          relationship_label: string | null
          is_known_to_party: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          character_id: string
          related_character_id: string
          relationship_type: string
          relationship_label?: string | null
          is_known_to_party?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          character_id?: string
          related_character_id?: string
          relationship_type?: string
          relationship_label?: string | null
          is_known_to_party?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_lore: {
        Row: {
          id: string
          campaign_id: string
          lore_type: 'family_tree' | 'faction' | 'timeline' | 'location' | 'artifact' | 'prophecy'
          title: string
          content: Json
          ai_generated: boolean
          last_analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          lore_type: 'family_tree' | 'faction' | 'timeline' | 'location' | 'artifact' | 'prophecy'
          title: string
          content: Json
          ai_generated?: boolean
          last_analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          lore_type?: 'family_tree' | 'faction' | 'timeline' | 'location' | 'artifact' | 'prophecy'
          title?: string
          content?: Json
          ai_generated?: boolean
          last_analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      intelligence_suggestions: {
        Row: {
          id: string
          campaign_id: string
          session_id: string | null
          character_id: string | null
          character_name: string | null
          suggestion_type: 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship'
          field_name: string
          current_value: Json | null
          suggested_value: Json
          source_excerpt: string
          ai_reasoning: string | null
          confidence: 'high' | 'medium' | 'low'
          status: 'pending' | 'applied' | 'rejected'
          final_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          session_id?: string | null
          character_id?: string | null
          character_name?: string | null
          suggestion_type: 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship'
          field_name: string
          current_value?: Json | null
          suggested_value: Json
          source_excerpt: string
          ai_reasoning?: string | null
          confidence?: 'high' | 'medium' | 'low'
          status?: 'pending' | 'applied' | 'rejected'
          final_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          session_id?: string | null
          character_id?: string | null
          character_name?: string | null
          suggestion_type?: 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship'
          field_name?: string
          current_value?: Json | null
          suggested_value?: Json
          source_excerpt?: string
          ai_reasoning?: string | null
          confidence?: 'high' | 'medium' | 'low'
          status?: 'pending' | 'applied' | 'rejected'
          final_value?: Json | null
          created_at?: string
        }
      }
      campaign_shares: {
        Row: {
          id: string
          share_code: string
          campaign_id: string
          share_type: string
          included_sections: Json
          expires_at: string | null
          view_count: number
          last_viewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          share_code: string
          campaign_id: string
          share_type?: string
          included_sections?: Json
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          share_code?: string
          campaign_id?: string
          share_type?: string
          included_sections?: Json
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type CharacterTag = Database['public']['Tables']['character_tags']['Row']
export type CanvasGroup = Database['public']['Tables']['canvas_groups']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionCharacter = Database['public']['Tables']['session_characters']['Row']
export type TimelineEvent = Database['public']['Tables']['timeline_events']['Row']
export type WorldMap = Database['public']['Tables']['world_maps']['Row']
export type MediaItem = Database['public']['Tables']['media_gallery']['Row']
export type CharacterVersion = Database['public']['Tables']['character_versions']['Row']
export type VaultCharacter = Database['public']['Tables']['vault_characters']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type StoryCharacter = Database['public']['Tables']['story_characters']['Row']
export type PlayJournal = Database['public']['Tables']['play_journal']['Row']
export type CharacterLink = Database['public']['Tables']['character_links']['Row']
export type CharacterLearnedFact = Database['public']['Tables']['character_learned_facts']['Row']
export type CharacterMoodBoard = Database['public']['Tables']['character_mood_board']['Row']
export type CharacterStatus = Database['public']['Tables']['character_statuses']['Row']
export type CharacterShare = Database['public']['Tables']['character_shares']['Row']
export type CharacterConnection = Database['public']['Tables']['character_connections']['Row']
export type OneshotGenreTag = Database['public']['Tables']['oneshot_genre_tags']['Row']
export type Oneshot = Database['public']['Tables']['oneshots']['Row']
export type OneshotRun = Database['public']['Tables']['oneshot_runs']['Row']
export type OneshotShare = Database['public']['Tables']['oneshot_shares']['Row']
export type CharacterRelationship = Database['public']['Tables']['character_relationships']['Row']
export type CampaignLore = Database['public']['Tables']['campaign_lore']['Row']
export type CampaignShare = Database['public']['Tables']['campaign_shares']['Row']
export type IntelligenceSuggestion = Database['public']['Tables']['intelligence_suggestions']['Row']

// Suggestion types for Campaign Intelligence
export type SuggestionType = 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

// Extended types with relations
export type CharacterWithTags = Character & {
  character_tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
}

export type SessionWithCharacters = Session & {
  session_characters: (SessionCharacter & { character: Character })[]
  timeline_events: TimelineEvent[]
}

export type CampaignWithDetails = Campaign & {
  characters: Character[]
  sessions: Session[]
  tags: Tag[]
}

export type OneshotWithDetails = Oneshot & {
  genre_tags: OneshotGenreTag[]
  runs: OneshotRun[]
}
