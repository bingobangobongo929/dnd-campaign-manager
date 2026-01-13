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
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          color?: string
          icon?: string | null
          tag_type?: 'categorical' | 'relational'
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          color?: string
          icon?: string | null
          tag_type?: 'categorical' | 'relational'
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
