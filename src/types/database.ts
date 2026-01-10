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
          image_url: string | null
          position_x: number
          position_y: number
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
          image_url?: string | null
          position_x?: number
          position_y?: number
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
          image_url?: string | null
          position_x?: number
          position_y?: number
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
          event_type: 'plot' | 'character_intro' | 'character_death' | 'location' | 'combat' | 'revelation' | 'quest_start' | 'quest_end' | 'other'
          title: string
          description: string | null
          character_ids: string[] | null
          event_order: number
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          session_id?: string | null
          event_type?: 'plot' | 'character_intro' | 'character_death' | 'location' | 'combat' | 'revelation' | 'quest_start' | 'quest_end' | 'other'
          title: string
          description?: string | null
          character_ids?: string[] | null
          event_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          session_id?: string | null
          event_type?: 'plot' | 'character_intro' | 'character_death' | 'location' | 'combat' | 'revelation' | 'quest_start' | 'quest_end' | 'other'
          title?: string
          description?: string | null
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
          description: string | null
          summary: string | null
          image_url: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          summary?: string | null
          image_url?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          summary?: string | null
          image_url?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
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
