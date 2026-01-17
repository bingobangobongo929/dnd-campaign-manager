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
          location: string | null
          is_major: boolean
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
          location?: string | null
          is_major?: boolean
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
          location?: string | null
          is_major?: boolean
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
          // Core text fields
          description: string | null
          backstory: string | null
          summary: string | null
          notes: string | null
          // Images (legacy - use vault_character_images table)
          image_url: string | null
          detail_image_url: string | null
          // Tags and status
          tags: string[] | null
          status: string | null
          status_color: string | null
          // Basic info
          race: string | null
          class: string | null
          subclass: string | null
          level: number | null
          background: string | null
          alignment: string | null
          deity: string | null
          // Demographics
          age: string | null
          pronouns: string | null
          // Physical appearance
          height: string | null
          weight: string | null
          hair: string | null
          eyes: string | null
          skin: string | null
          voice: string | null
          distinguishing_marks: string | null
          typical_attire: string | null
          appearance: string | null
          // Creative references
          faceclaim: string | null
          voice_claim: string | null
          // Personality
          personality: string | null
          ideals: string | null
          bonds: string | null
          flaws: string | null
          mannerisms: string | null
          speech_patterns: string | null
          motivations: string | null
          // Goals and secrets
          goals: string | null
          secrets: string | null
          // Arrays
          quotes: string[] | null
          common_phrases: string[] | null
          weaknesses: string[] | null
          fears: string[] | null
          plot_hooks: string[] | null
          tldr: string[] | null
          open_questions: string[] | null
          character_tags: string[] | null
          // Media links
          theme_music_url: string | null
          theme_music_title: string | null
          character_sheet_url: string | null
          spotify_playlist: string | null
          pinterest_board: string | null
          // Campaign context
          game_system: string | null
          external_campaign: string | null
          linked_campaign_id: string | null
          party_name: string | null
          party_role: string | null
          player_name: string | null
          dm_name: string | null
          campaign_started: string | null
          joined_session: number | null
          retired_session: number | null
          // Legacy JSONB (use new tables instead)
          quick_stats: Json | null
          inventory: Json | null
          important_people: Json | null
          session_journal: Json | null
          signature_items: Json | null
          family: Json | null
          // New structured JSONB
          backstory_phases: Json | null
          story_arcs: Json | null
          factions: Json | null
          companions: Json | null
          possessions: Json | null
          art_references: Json | null
          // Game mechanics
          ability_scores: Json | null
          hit_points: Json | null
          armor_class: number | null
          speed: string | null
          proficiencies: Json | null
          languages: string[] | null
          saving_throws: string[] | null
          resistances: string[] | null
          immunities: string[] | null
          vulnerabilities: string[] | null
          // Aesthetic
          aesthetic_tags: string[] | null
          color_palette: string[] | null
          // Organization
          folder: string | null
          is_archived: boolean
          is_favorite: boolean
          display_order: number
          // Privacy & Sharing
          visibility: string | null
          dm_notes: string | null
          share_token: string | null
          is_public: boolean
          allow_comments: boolean
          // Backstory
          origin_location: string | null
          // NPC-specific
          npc_role: string | null
          first_appearance: string | null
          location: string | null
          disposition: string | null
          occupation: string | null
          // Tracking
          gold: number | null
          source_file: string | null
          imported_at: string | null
          raw_document_text: string | null
          last_intelligence_run: string | null
          // New fields from migration 018
          character_writings: Json | null
          rumors: Json | null
          dm_qa: Json | null
          player_discord: string | null
          player_timezone: string | null
          player_experience: string | null
          player_preferences: Json | null
          gameplay_tips: string[] | null
          party_relations: Json | null
          combat_stats: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: 'pc' | 'npc'
          description?: string | null
          backstory?: string | null
          summary?: string | null
          notes?: string | null
          image_url?: string | null
          detail_image_url?: string | null
          tags?: string[] | null
          status?: string | null
          status_color?: string | null
          race?: string | null
          class?: string | null
          subclass?: string | null
          level?: number | null
          background?: string | null
          alignment?: string | null
          deity?: string | null
          age?: string | null
          pronouns?: string | null
          height?: string | null
          weight?: string | null
          hair?: string | null
          eyes?: string | null
          skin?: string | null
          voice?: string | null
          distinguishing_marks?: string | null
          typical_attire?: string | null
          appearance?: string | null
          faceclaim?: string | null
          voice_claim?: string | null
          personality?: string | null
          ideals?: string | null
          bonds?: string | null
          flaws?: string | null
          mannerisms?: string | null
          speech_patterns?: string | null
          motivations?: string | null
          goals?: string | null
          secrets?: string | null
          quotes?: string[] | null
          common_phrases?: string[] | null
          weaknesses?: string[] | null
          fears?: string[] | null
          plot_hooks?: string[] | null
          tldr?: string[] | null
          open_questions?: string[] | null
          character_tags?: string[] | null
          theme_music_url?: string | null
          theme_music_title?: string | null
          character_sheet_url?: string | null
          spotify_playlist?: string | null
          pinterest_board?: string | null
          game_system?: string | null
          external_campaign?: string | null
          linked_campaign_id?: string | null
          party_name?: string | null
          party_role?: string | null
          player_name?: string | null
          dm_name?: string | null
          campaign_started?: string | null
          joined_session?: number | null
          retired_session?: number | null
          quick_stats?: Json | null
          inventory?: Json | null
          important_people?: Json | null
          session_journal?: Json | null
          signature_items?: Json | null
          family?: Json | null
          backstory_phases?: Json | null
          story_arcs?: Json | null
          factions?: Json | null
          companions?: Json | null
          possessions?: Json | null
          art_references?: Json | null
          ability_scores?: Json | null
          hit_points?: Json | null
          armor_class?: number | null
          speed?: string | null
          proficiencies?: Json | null
          languages?: string[] | null
          saving_throws?: string[] | null
          resistances?: string[] | null
          immunities?: string[] | null
          vulnerabilities?: string[] | null
          aesthetic_tags?: string[] | null
          color_palette?: string[] | null
          folder?: string | null
          is_archived?: boolean
          is_favorite?: boolean
          display_order?: number
          visibility?: string | null
          dm_notes?: string | null
          share_token?: string | null
          is_public?: boolean
          allow_comments?: boolean
          origin_location?: string | null
          npc_role?: string | null
          first_appearance?: string | null
          location?: string | null
          disposition?: string | null
          occupation?: string | null
          gold?: number | null
          source_file?: string | null
          imported_at?: string | null
          raw_document_text?: string | null
          last_intelligence_run?: string | null
          // New fields from migration 018
          character_writings?: Json | null
          rumors?: Json | null
          dm_qa?: Json | null
          player_discord?: string | null
          player_timezone?: string | null
          player_experience?: string | null
          player_preferences?: Json | null
          gameplay_tips?: string[] | null
          party_relations?: Json | null
          combat_stats?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'pc' | 'npc'
          description?: string | null
          backstory?: string | null
          summary?: string | null
          notes?: string | null
          image_url?: string | null
          detail_image_url?: string | null
          tags?: string[] | null
          status?: string | null
          status_color?: string | null
          race?: string | null
          class?: string | null
          subclass?: string | null
          level?: number | null
          background?: string | null
          alignment?: string | null
          deity?: string | null
          age?: string | null
          pronouns?: string | null
          height?: string | null
          weight?: string | null
          hair?: string | null
          eyes?: string | null
          skin?: string | null
          voice?: string | null
          distinguishing_marks?: string | null
          typical_attire?: string | null
          appearance?: string | null
          faceclaim?: string | null
          voice_claim?: string | null
          personality?: string | null
          ideals?: string | null
          bonds?: string | null
          flaws?: string | null
          mannerisms?: string | null
          speech_patterns?: string | null
          motivations?: string | null
          goals?: string | null
          secrets?: string | null
          quotes?: string[] | null
          common_phrases?: string[] | null
          weaknesses?: string[] | null
          fears?: string[] | null
          plot_hooks?: string[] | null
          tldr?: string[] | null
          open_questions?: string[] | null
          character_tags?: string[] | null
          theme_music_url?: string | null
          theme_music_title?: string | null
          character_sheet_url?: string | null
          spotify_playlist?: string | null
          pinterest_board?: string | null
          game_system?: string | null
          external_campaign?: string | null
          linked_campaign_id?: string | null
          party_name?: string | null
          party_role?: string | null
          player_name?: string | null
          dm_name?: string | null
          campaign_started?: string | null
          joined_session?: number | null
          retired_session?: number | null
          quick_stats?: Json | null
          inventory?: Json | null
          important_people?: Json | null
          session_journal?: Json | null
          signature_items?: Json | null
          family?: Json | null
          backstory_phases?: Json | null
          story_arcs?: Json | null
          factions?: Json | null
          companions?: Json | null
          possessions?: Json | null
          art_references?: Json | null
          ability_scores?: Json | null
          hit_points?: Json | null
          armor_class?: number | null
          speed?: string | null
          proficiencies?: Json | null
          languages?: string[] | null
          saving_throws?: string[] | null
          resistances?: string[] | null
          immunities?: string[] | null
          vulnerabilities?: string[] | null
          aesthetic_tags?: string[] | null
          color_palette?: string[] | null
          folder?: string | null
          is_archived?: boolean
          is_favorite?: boolean
          display_order?: number
          visibility?: string | null
          dm_notes?: string | null
          share_token?: string | null
          is_public?: boolean
          allow_comments?: boolean
          origin_location?: string | null
          npc_role?: string | null
          first_appearance?: string | null
          location?: string | null
          disposition?: string | null
          occupation?: string | null
          gold?: number | null
          source_file?: string | null
          imported_at?: string | null
          raw_document_text?: string | null
          last_intelligence_run?: string | null
          // New fields from migration 018
          character_writings?: Json | null
          rumors?: Json | null
          dm_qa?: Json | null
          player_discord?: string | null
          player_timezone?: string | null
          player_experience?: string | null
          player_preferences?: Json | null
          gameplay_tips?: string[] | null
          party_relations?: Json | null
          combat_stats?: Json | null
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
          campaign_name: string | null
          summary: string | null
          kill_count: number | null
          loot: string | null
          thoughts_for_next: string | null
          npcs_met: string[] | null
          locations_visited: string[] | null
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
          campaign_name?: string | null
          summary?: string | null
          kill_count?: number | null
          loot?: string | null
          thoughts_for_next?: string | null
          npcs_met?: string[] | null
          locations_visited?: string[] | null
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
          campaign_name?: string | null
          summary?: string | null
          kill_count?: number | null
          loot?: string | null
          thoughts_for_next?: string | null
          npcs_met?: string[] | null
          locations_visited?: string[] | null
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
          last_viewed_at: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          share_code: string
          character_id: string
          included_sections: Json
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          share_code?: string
          character_id?: string
          included_sections?: Json
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          note?: string | null
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
          last_viewed_at: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          share_code: string
          oneshot_id: string
          included_sections: Json
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          share_code?: string
          oneshot_id?: string
          included_sections?: Json
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          note?: string | null
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
          campaign_id: string | null
          session_id: string | null
          character_id: string | null
          vault_character_id: string | null
          character_name: string | null
          suggestion_type: 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship' | 'timeline_event' | 'completeness' | 'consistency' | 'npc_detected' | 'location_detected' | 'plot_hook' | 'enrichment' | 'timeline_issue'
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
          campaign_id?: string | null
          session_id?: string | null
          character_id?: string | null
          vault_character_id?: string | null
          character_name?: string | null
          suggestion_type: 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship' | 'timeline_event' | 'completeness' | 'consistency' | 'npc_detected' | 'location_detected' | 'plot_hook' | 'enrichment' | 'timeline_issue'
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
          campaign_id?: string | null
          session_id?: string | null
          character_id?: string | null
          vault_character_id?: string | null
          character_name?: string | null
          suggestion_type?: 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person' | 'relationship' | 'timeline_event' | 'completeness' | 'consistency' | 'npc_detected' | 'location_detected' | 'plot_hook' | 'enrichment' | 'timeline_issue'
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
          note: string | null
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
          note?: string | null
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
          note?: string | null
          created_at?: string
        }
      }
      share_view_events: {
        Row: {
          id: string
          share_id: string
          share_type: 'character' | 'oneshot' | 'campaign'
          viewed_at: string
          viewer_hash: string | null
          referrer: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          share_id: string
          share_type: 'character' | 'oneshot' | 'campaign'
          viewed_at?: string
          viewer_hash?: string | null
          referrer?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          share_id?: string
          share_type?: 'character' | 'oneshot' | 'campaign'
          viewed_at?: string
          viewer_hash?: string | null
          referrer?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      // =====================================================
      // NEW VAULT TABLES
      // =====================================================
      vault_character_images: {
        Row: {
          id: string
          user_id: string
          character_id: string
          image_url: string
          image_type: string | null
          caption: string | null
          artist_credit: string | null
          artist_url: string | null
          is_primary: boolean
          is_ai_generated: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          character_id: string
          image_url: string
          image_type?: string | null
          caption?: string | null
          artist_credit?: string | null
          artist_url?: string | null
          is_primary?: boolean
          is_ai_generated?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          character_id?: string
          image_url?: string
          image_type?: string | null
          caption?: string | null
          artist_credit?: string | null
          artist_url?: string | null
          is_primary?: boolean
          is_ai_generated?: boolean
          display_order?: number
          created_at?: string
        }
      }
      vault_character_relationships: {
        Row: {
          id: string
          user_id: string
          character_id: string
          related_character_id: string | null
          related_name: string | null
          related_image_url: string | null
          relationship_type: string
          relationship_label: string | null
          description: string | null
          from_perspective: string | null
          to_perspective: string | null
          relationship_status: string | null
          is_known: boolean
          is_mutual: boolean
          first_met: string | null
          display_order: number
          created_at: string
          updated_at: string
          // New NPC detail fields (migration 019)
          nickname: string | null
          faction_affiliations: string[] | null
          location: string | null
          needs: string | null
          can_provide: string | null
          goals: string | null
          secrets: string | null
          personality_traits: string[] | null
          full_notes: string | null
          occupation: string | null
          origin: string | null
          // Companion fields
          is_companion: boolean
          companion_type: string | null
          companion_species: string | null
          companion_abilities: string | null
          // Party member flag (migration 023)
          is_party_member: boolean
        }
        Insert: {
          id?: string
          user_id: string
          character_id: string
          related_character_id?: string | null
          related_name?: string | null
          related_image_url?: string | null
          relationship_type: string
          relationship_label?: string | null
          description?: string | null
          from_perspective?: string | null
          to_perspective?: string | null
          relationship_status?: string | null
          is_known?: boolean
          is_mutual?: boolean
          first_met?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          // New NPC detail fields (migration 019)
          nickname?: string | null
          faction_affiliations?: string[] | null
          location?: string | null
          needs?: string | null
          can_provide?: string | null
          goals?: string | null
          secrets?: string | null
          personality_traits?: string[] | null
          full_notes?: string | null
          occupation?: string | null
          origin?: string | null
          // Companion fields
          is_companion?: boolean
          companion_type?: string | null
          companion_species?: string | null
          companion_abilities?: string | null
          // Party member flag (migration 023)
          is_party_member?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          character_id?: string
          related_character_id?: string | null
          related_name?: string | null
          related_image_url?: string | null
          relationship_type?: string
          relationship_label?: string | null
          description?: string | null
          from_perspective?: string | null
          to_perspective?: string | null
          relationship_status?: string | null
          is_known?: boolean
          is_mutual?: boolean
          first_met?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          // New NPC detail fields (migration 019)
          nickname?: string | null
          faction_affiliations?: string[] | null
          location?: string | null
          needs?: string | null
          can_provide?: string | null
          goals?: string | null
          secrets?: string | null
          personality_traits?: string[] | null
          full_notes?: string | null
          occupation?: string | null
          origin?: string | null
          // Companion fields
          is_companion?: boolean
          companion_type?: string | null
          companion_species?: string | null
          companion_abilities?: string | null
          // Party member flag (migration 023)
          is_party_member?: boolean
        }
      }
      vault_locations: {
        Row: {
          id: string
          user_id: string
          name: string
          location_type: string | null
          description: string | null
          image_url: string | null
          campaign_name: string | null
          game_system: string | null
          parent_location_id: string | null
          notable_features: string | null
          dangers: string | null
          inhabitants: string | null
          notes: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          location_type?: string | null
          description?: string | null
          image_url?: string | null
          campaign_name?: string | null
          game_system?: string | null
          parent_location_id?: string | null
          notable_features?: string | null
          dangers?: string | null
          inhabitants?: string | null
          notes?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          location_type?: string | null
          description?: string | null
          image_url?: string | null
          campaign_name?: string | null
          game_system?: string | null
          parent_location_id?: string | null
          notable_features?: string | null
          dangers?: string | null
          inhabitants?: string | null
          notes?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vault_character_locations: {
        Row: {
          id: string
          character_id: string
          location_id: string
          relationship: string
          significance: string | null
          notes: string | null
          time_period: string | null
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          location_id: string
          relationship: string
          significance?: string | null
          notes?: string | null
          time_period?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          location_id?: string
          relationship?: string
          significance?: string | null
          notes?: string | null
          time_period?: string | null
          created_at?: string
        }
      }
      vault_character_snapshots: {
        Row: {
          id: string
          user_id: string
          character_id: string
          snapshot_name: string
          snapshot_type: string | null
          level_at_snapshot: number | null
          snapshot_data: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          character_id: string
          snapshot_name: string
          snapshot_type?: string | null
          level_at_snapshot?: number | null
          snapshot_data: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          character_id?: string
          snapshot_name?: string
          snapshot_type?: string | null
          level_at_snapshot?: number | null
          snapshot_data?: Json
          notes?: string | null
          created_at?: string
        }
      }
      vault_character_spells: {
        Row: {
          id: string
          character_id: string
          spell_name: string
          spell_level: number
          spell_school: string | null
          source: string | null
          source_detail: string | null
          is_prepared: boolean
          is_ritual: boolean
          is_concentration: boolean
          casting_time: string | null
          range: string | null
          components: string | null
          duration: string | null
          description: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          spell_name: string
          spell_level?: number
          spell_school?: string | null
          source?: string | null
          source_detail?: string | null
          is_prepared?: boolean
          is_ritual?: boolean
          is_concentration?: boolean
          casting_time?: string | null
          range?: string | null
          components?: string | null
          duration?: string | null
          description?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          spell_name?: string
          spell_level?: number
          spell_school?: string | null
          source?: string | null
          source_detail?: string | null
          is_prepared?: boolean
          is_ritual?: boolean
          is_concentration?: boolean
          casting_time?: string | null
          range?: string | null
          components?: string | null
          duration?: string | null
          description?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      vault_character_writings: {
        Row: {
          id: string
          user_id: string
          character_id: string
          title: string
          writing_type: string | null
          content: string
          recipient: string | null
          in_universe_date: string | null
          session_reference: string | null
          is_sent: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          character_id: string
          title: string
          writing_type?: string | null
          content: string
          recipient?: string | null
          in_universe_date?: string | null
          session_reference?: string | null
          is_sent?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          character_id?: string
          title?: string
          writing_type?: string | null
          content?: string
          recipient?: string | null
          in_universe_date?: string | null
          session_reference?: string | null
          is_sent?: boolean
          display_order?: number
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
export type OneshotGenreTag = Database['public']['Tables']['oneshot_genre_tags']['Row']
export type Oneshot = Database['public']['Tables']['oneshots']['Row']
export type OneshotRun = Database['public']['Tables']['oneshot_runs']['Row']
export type OneshotShare = Database['public']['Tables']['oneshot_shares']['Row']
export type CharacterRelationship = Database['public']['Tables']['character_relationships']['Row']
export type CampaignLore = Database['public']['Tables']['campaign_lore']['Row']
export type CampaignShare = Database['public']['Tables']['campaign_shares']['Row']
export type ShareViewEvent = Database['public']['Tables']['share_view_events']['Row']
export type IntelligenceSuggestion = Database['public']['Tables']['intelligence_suggestions']['Row']

// New Vault table types
export type VaultCharacterImage = Database['public']['Tables']['vault_character_images']['Row']
export type VaultCharacterRelationship = Database['public']['Tables']['vault_character_relationships']['Row']
export type VaultLocation = Database['public']['Tables']['vault_locations']['Row']
export type VaultCharacterLocation = Database['public']['Tables']['vault_character_locations']['Row']
export type VaultCharacterSnapshot = Database['public']['Tables']['vault_character_snapshots']['Row']
export type VaultCharacterSpell = Database['public']['Tables']['vault_character_spells']['Row']
export type VaultCharacterWriting = Database['public']['Tables']['vault_character_writings']['Row']

// Suggestion types for Campaign & Character Intelligence
export type SuggestionType =
  // Campaign Intelligence types
  | 'status_change' | 'secret_revealed' | 'story_hook' | 'quote' | 'important_person'
  | 'relationship' | 'timeline_event' | 'completeness' | 'consistency'
  | 'npc_detected' | 'location_detected' | 'plot_hook' | 'enrichment' | 'timeline_issue'
  // Character Intelligence types
  | 'grammar' | 'formatting' | 'lore_conflict' | 'redundancy'
  | 'voice_inconsistency' | 'relationship_gap' | 'secret_opportunity' | 'cross_reference'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

// Vault character with all relations
export type VaultCharacterFull = VaultCharacter & {
  images: VaultCharacterImage[]
  relationships: (VaultCharacterRelationship & { related_character?: VaultCharacter | null })[]
  locations: (VaultCharacterLocation & { location: VaultLocation })[]
  spells: VaultCharacterSpell[]
  snapshots: VaultCharacterSnapshot[]
  writings: VaultCharacterWriting[]
}

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
