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
          is_demo: boolean
          // Template system fields
          content_mode: 'active' | 'inactive'
          is_published: boolean
          template_id: string | null
          template_version: number
          saved_template_version: number | null
          published_at: string | null
          is_session0_ready: boolean
          template_description: string | null
          template_tags: string[] | null
          template_save_count: number
          allow_save: boolean
          attribution_name: string | null
          inactive_reason: string | null
          // Collaboration settings (Multiloop upgrade)
          collaboration_settings: Json
          // Session workflow defaults
          default_session_sections: Json
          default_prep_checklist: Json
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
          is_demo?: boolean
          // Template system fields
          content_mode?: 'active' | 'inactive'
          is_published?: boolean
          template_id?: string | null
          template_version?: number
          saved_template_version?: number | null
          published_at?: string | null
          is_session0_ready?: boolean
          template_description?: string | null
          template_tags?: string[] | null
          template_save_count?: number
          allow_save?: boolean
          attribution_name?: string | null
          inactive_reason?: string | null
          // Collaboration settings (Multiloop upgrade)
          collaboration_settings?: Json
          // Session workflow defaults
          default_session_sections?: Json
          default_prep_checklist?: Json
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
          is_demo?: boolean
          // Template system fields
          content_mode?: 'active' | 'inactive'
          is_published?: boolean
          template_id?: string | null
          template_version?: number
          saved_template_version?: number | null
          published_at?: string | null
          is_session0_ready?: boolean
          template_description?: string | null
          template_tags?: string[] | null
          template_save_count?: number
          allow_save?: boolean
          attribution_name?: string | null
          inactive_reason?: string | null
          // Collaboration settings (Multiloop upgrade)
          collaboration_settings?: Json
          // Session workflow defaults
          default_session_sections?: Json
          default_prep_checklist?: Json
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
          // Multiloop upgrade: collaboration fields
          dm_notes: string | null
          visibility: 'public' | 'party' | 'dm_only'
          vault_character_id: string | null
          controlled_by_user_id: string | null
          controlled_by_email: string | null
          controlled_by_discord: string | null
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
          // Multiloop upgrade: collaboration fields
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          vault_character_id?: string | null
          controlled_by_user_id?: string | null
          controlled_by_email?: string | null
          controlled_by_discord?: string | null
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
          // Multiloop upgrade: collaboration fields
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          vault_character_id?: string | null
          controlled_by_user_id?: string | null
          controlled_by_email?: string | null
          controlled_by_discord?: string | null
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
          description: string | null
          is_archived: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          color?: string
          icon?: string | null
          tag_type?: 'categorical' | 'relational'
          category?: 'general' | 'faction' | 'relationship'
          description?: string | null
          is_archived?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          color?: string
          icon?: string | null
          tag_type?: 'categorical' | 'relational'
          category?: 'general' | 'faction' | 'relationship'
          description?: string | null
          is_archived?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
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
          // Session workflow
          phase: 'prep' | 'live' | 'completed'
          prep_checklist: Json
          thoughts_for_next: string | null
          enabled_sections: Json
          session_timer: Json | null
          pinned_references: Json
          attendees: Json
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
          // Session workflow
          phase?: 'prep' | 'live' | 'completed'
          prep_checklist?: Json
          thoughts_for_next?: string | null
          enabled_sections?: Json
          session_timer?: Json | null
          pinned_references?: Json
          attendees?: Json
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
          // Session workflow
          phase?: 'prep' | 'live' | 'completed'
          prep_checklist?: Json
          thoughts_for_next?: string | null
          enabled_sections?: Json
          session_timer?: Json | null
          pinned_references?: Json
          attendees?: Json
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
          // Multiloop upgrade: visibility
          dm_notes: string | null
          visibility: 'public' | 'party' | 'dm_only'
          // Timeline eras/chapters
          era_id: string | null
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
          // Multiloop upgrade: visibility
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          // Timeline eras/chapters
          era_id?: string | null
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
          // Multiloop upgrade: visibility
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          // Timeline eras/chapters
          era_id?: string | null
          created_at?: string
        }
      }
      // =====================================================
      // CAMPAIGN ERAS (Timeline Chapters)
      // =====================================================
      campaign_eras: {
        Row: {
          id: string
          campaign_id: string
          name: string
          description: string | null
          color: string
          icon: string
          start_date: string | null
          end_date: string | null
          sort_order: number
          is_collapsed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          description?: string | null
          color?: string
          icon?: string
          start_date?: string | null
          end_date?: string | null
          sort_order?: number
          is_collapsed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string
          start_date?: string | null
          end_date?: string | null
          sort_order?: number
          is_collapsed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      world_maps: {
        Row: {
          id: string
          campaign_id: string
          image_url: string
          name: string | null
          // Multiloop upgrade: interactive maps
          fog_of_war: Json
          layers: Json
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          image_url: string
          name?: string | null
          // Multiloop upgrade: interactive maps
          fog_of_war?: Json
          layers?: Json
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          image_url?: string
          name?: string | null
          // Multiloop upgrade: interactive maps
          fog_of_war?: Json
          layers?: Json
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
          is_demo: boolean
          // Template system fields
          content_mode: 'active' | 'inactive'
          is_published: boolean
          template_id: string | null
          template_version: number
          saved_template_version: number | null
          published_at: string | null
          is_session0_ready: boolean
          template_description: string | null
          template_tags: string[] | null
          template_save_count: number
          allow_save: boolean
          attribution_name: string | null
          inactive_reason: string | null
          // Multiloop upgrade: campaign linking
          campaign_links: Json
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
          // Template system fields
          content_mode?: 'active' | 'inactive'
          is_published?: boolean
          template_id?: string | null
          template_version?: number
          saved_template_version?: number | null
          published_at?: string | null
          is_session0_ready?: boolean
          template_description?: string | null
          template_tags?: string[] | null
          template_save_count?: number
          allow_save?: boolean
          attribution_name?: string | null
          inactive_reason?: string | null
          // Multiloop upgrade: campaign linking
          campaign_links?: Json
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
          is_demo?: boolean
          // Template system fields
          content_mode?: 'active' | 'inactive'
          is_published?: boolean
          template_id?: string | null
          template_version?: number
          saved_template_version?: number | null
          published_at?: string | null
          is_session0_ready?: boolean
          template_description?: string | null
          template_tags?: string[] | null
          template_save_count?: number
          allow_save?: boolean
          attribution_name?: string | null
          inactive_reason?: string | null
          // Multiloop upgrade: campaign linking
          campaign_links?: Json
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
          status: 'active' | 'deleted'
          allow_save: boolean
          snapshot_version: number | null
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
          status?: 'active' | 'deleted'
          allow_save?: boolean
          snapshot_version?: number | null
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
          status?: 'active' | 'deleted'
          allow_save?: boolean
          snapshot_version?: number | null
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
          is_demo: boolean
          // Template system fields
          content_mode: 'active' | 'inactive'
          is_published: boolean
          template_id: string | null
          template_version: number
          saved_template_version: number | null
          published_at: string | null
          is_session0_ready: boolean
          template_description: string | null
          template_tags: string[] | null
          template_save_count: number
          allow_save: boolean
          attribution_name: string | null
          inactive_reason: string | null
          // Multiloop upgrade: structured content
          has_structured_npcs: boolean
          has_structured_encounters: boolean
          has_structured_locations: boolean
          // Run mode fields
          encounter_presets: Json
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
          is_demo?: boolean
          // Template system fields
          content_mode?: 'active' | 'inactive'
          is_published?: boolean
          template_id?: string | null
          template_version?: number
          saved_template_version?: number | null
          published_at?: string | null
          is_session0_ready?: boolean
          template_description?: string | null
          template_tags?: string[] | null
          template_save_count?: number
          allow_save?: boolean
          attribution_name?: string | null
          inactive_reason?: string | null
          // Multiloop upgrade: structured content
          has_structured_npcs?: boolean
          has_structured_encounters?: boolean
          has_structured_locations?: boolean
          // Run mode fields
          encounter_presets?: Json
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
          is_demo?: boolean
          // Template system fields
          content_mode?: 'active' | 'inactive'
          is_published?: boolean
          template_id?: string | null
          template_version?: number
          saved_template_version?: number | null
          published_at?: string | null
          is_session0_ready?: boolean
          template_description?: string | null
          template_tags?: string[] | null
          template_save_count?: number
          allow_save?: boolean
          attribution_name?: string | null
          inactive_reason?: string | null
          // Multiloop upgrade: structured content
          has_structured_npcs?: boolean
          has_structured_encounters?: boolean
          has_structured_locations?: boolean
          // Run mode fields
          encounter_presets?: Json
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
          status: 'active' | 'deleted'
          allow_save: boolean
          snapshot_version: number | null
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
          status?: 'active' | 'deleted'
          allow_save?: boolean
          snapshot_version?: number | null
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
          status?: 'active' | 'deleted'
          allow_save?: boolean
          snapshot_version?: number | null
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          username: string | null
          username_set_at: string | null
          ai_provider: 'anthropic' | 'google'
          theme: 'dark' | 'light' | 'system'
          tier: 'adventurer' | 'hero' | 'legend'
          role: 'user' | 'moderator' | 'super_admin'
          avatar_url: string | null
          // Account status
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          disabled_at: string | null
          disabled_by: string | null
          // GDPR compliance
          terms_accepted_at: string | null
          privacy_accepted_at: string | null
          marketing_consent: boolean
          last_login_at: string | null
          // 2FA
          totp_secret: string | null
          totp_enabled: boolean
          totp_verified_at: string | null
          backup_codes: string[] | null
          // Onboarding
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          show_tips: boolean
          tips_dismissed: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          username?: string | null
          username_set_at?: string | null
          ai_provider?: 'anthropic' | 'google'
          theme?: 'dark' | 'light' | 'system'
          tier?: 'adventurer' | 'hero' | 'legend'
          role?: 'user' | 'moderator' | 'super_admin'
          avatar_url?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          terms_accepted_at?: string | null
          privacy_accepted_at?: string | null
          marketing_consent?: boolean
          last_login_at?: string | null
          totp_secret?: string | null
          totp_enabled?: boolean
          totp_verified_at?: string | null
          backup_codes?: string[] | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          show_tips?: boolean
          tips_dismissed?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          username?: string | null
          username_set_at?: string | null
          ai_provider?: 'anthropic' | 'google'
          theme?: 'dark' | 'light' | 'system'
          tier?: 'adventurer' | 'hero' | 'legend'
          role?: 'user' | 'moderator' | 'super_admin'
          avatar_url?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          terms_accepted_at?: string | null
          privacy_accepted_at?: string | null
          marketing_consent?: boolean
          last_login_at?: string | null
          totp_secret?: string | null
          totp_enabled?: boolean
          totp_verified_at?: string | null
          backup_codes?: string[] | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          show_tips?: boolean
          tips_dismissed?: Json
          created_at?: string
          updated_at?: string
        }
      }
      play_journal_attendees: {
        Row: {
          id: string
          play_journal_id: string
          relationship_id: string
          created_at: string
        }
        Insert: {
          id?: string
          play_journal_id: string
          relationship_id: string
          created_at?: string
        }
        Update: {
          id?: string
          play_journal_id?: string
          relationship_id?: string
          created_at?: string
        }
      }
      changelog: {
        Row: {
          id: string
          version: string
          title: string
          content: string
          published_at: string
          is_major: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          version: string
          title: string
          content: string
          published_at?: string
          is_major?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          version?: string
          title?: string
          content?: string
          published_at?: string
          is_major?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_activity_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_user_id: string | null
          details: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_user_id?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_user_id?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
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
          // Multiloop upgrade: visibility
          dm_notes: string | null
          visibility: 'public' | 'party' | 'dm_only'
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
          // Multiloop upgrade: visibility
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
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
          // Multiloop upgrade: visibility
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
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
          status: 'active' | 'deleted'
          allow_save: boolean
          snapshot_version: number | null
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
          status?: 'active' | 'deleted'
          allow_save?: boolean
          snapshot_version?: number | null
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
          status?: 'active' | 'deleted'
          allow_save?: boolean
          snapshot_version?: number | null
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
      // =====================================================
      // TEMPLATE SYSTEM TABLES
      // =====================================================
      template_snapshots: {
        Row: {
          id: string
          user_id: string
          content_type: 'campaign' | 'character' | 'oneshot'
          content_id: string
          version: number
          version_name: string | null
          version_notes: string | null
          snapshot_data: Json
          related_data: Json | null
          allow_save: boolean
          attribution_name: string | null
          template_description: string | null
          template_tags: string[] | null
          save_count: number
          view_count: number
          is_public: boolean
          published_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_type: 'campaign' | 'character' | 'oneshot'
          content_id: string
          version?: number
          version_name?: string | null
          version_notes?: string | null
          snapshot_data: Json
          related_data?: Json | null
          allow_save?: boolean
          attribution_name?: string | null
          template_description?: string | null
          template_tags?: string[] | null
          save_count?: number
          view_count?: number
          is_public?: boolean
          published_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_type?: 'campaign' | 'character' | 'oneshot'
          content_id?: string
          version?: number
          version_name?: string | null
          version_notes?: string | null
          snapshot_data?: Json
          related_data?: Json | null
          allow_save?: boolean
          attribution_name?: string | null
          template_description?: string | null
          template_tags?: string[] | null
          save_count?: number
          view_count?: number
          is_public?: boolean
          published_at?: string
          created_at?: string
        }
      }
      content_saves: {
        Row: {
          id: string
          user_id: string
          snapshot_id: string
          source_type: string
          source_name: string
          source_image_url: string | null
          source_owner_id: string
          saved_version: number
          latest_available_version: number | null
          update_available: boolean
          instance_id: string | null
          started_playing_at: string | null
          saved_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          snapshot_id: string
          source_type: string
          source_name: string
          source_image_url?: string | null
          source_owner_id: string
          saved_version: number
          latest_available_version?: number | null
          update_available?: boolean
          instance_id?: string | null
          started_playing_at?: string | null
          saved_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          snapshot_id?: string
          source_type?: string
          source_name?: string
          source_image_url?: string | null
          source_owner_id?: string
          saved_version?: number
          latest_available_version?: number | null
          update_available?: boolean
          instance_id?: string | null
          started_playing_at?: string | null
          saved_at?: string
          created_at?: string
        }
      }
      // =====================================================
      // RUN MODE TABLES
      // =====================================================
      run_sessions: {
        Row: {
          id: string
          oneshot_id: string
          user_id: string
          share_code: string
          session_state: Json
          is_active: boolean
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          oneshot_id: string
          user_id: string
          share_code: string
          session_state?: Json
          is_active?: boolean
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          oneshot_id?: string
          user_id?: string
          share_code?: string
          session_state?: Json
          is_active?: boolean
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // =====================================================
      // CAMPAIGN TAGS & RELATIONSHIPS SYSTEM
      // =====================================================
      relationship_templates: {
        Row: {
          id: string
          campaign_id: string | null
          name: string
          inverse_name: string | null
          relationship_mode: 'symmetric' | 'asymmetric' | 'one_way'
          color: string
          icon: string | null
          inverse_icon: string | null
          description: string | null
          category: 'family' | 'professional' | 'romantic' | 'conflict' | 'social' | 'other'
          is_system: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          name: string
          inverse_name?: string | null
          relationship_mode?: 'symmetric' | 'asymmetric' | 'one_way'
          color?: string
          icon?: string | null
          inverse_icon?: string | null
          description?: string | null
          category?: 'family' | 'professional' | 'romantic' | 'conflict' | 'social' | 'other'
          is_system?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          name?: string
          inverse_name?: string | null
          relationship_mode?: 'symmetric' | 'asymmetric' | 'one_way'
          color?: string
          icon?: string | null
          inverse_icon?: string | null
          description?: string | null
          category?: 'family' | 'professional' | 'romantic' | 'conflict' | 'social' | 'other'
          is_system?: boolean
          display_order?: number
          created_at?: string
        }
      }
      campaign_factions: {
        Row: {
          id: string
          campaign_id: string
          name: string
          description: string | null
          color: string
          icon: string
          image_url: string | null
          parent_faction_id: string | null
          faction_type: 'guild' | 'kingdom' | 'cult' | 'family' | 'military' | 'criminal' | 'religious' | 'merchant' | 'academic' | 'other'
          alignment: string | null
          status: 'active' | 'disbanded' | 'secret' | 'destroyed'
          headquarters: string | null
          is_known_to_party: boolean
          notes: string | null
          // Multiloop upgrade: visibility
          dm_notes: string | null
          visibility: 'public' | 'party' | 'dm_only'
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          description?: string | null
          color?: string
          icon?: string
          image_url?: string | null
          parent_faction_id?: string | null
          faction_type?: 'guild' | 'kingdom' | 'cult' | 'family' | 'military' | 'criminal' | 'religious' | 'merchant' | 'academic' | 'other'
          alignment?: string | null
          status?: 'active' | 'disbanded' | 'secret' | 'destroyed'
          headquarters?: string | null
          is_known_to_party?: boolean
          notes?: string | null
          // Multiloop upgrade: visibility
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string
          image_url?: string | null
          parent_faction_id?: string | null
          faction_type?: 'guild' | 'kingdom' | 'cult' | 'family' | 'military' | 'criminal' | 'religious' | 'merchant' | 'academic' | 'other'
          alignment?: string | null
          status?: 'active' | 'disbanded' | 'secret' | 'destroyed'
          headquarters?: string | null
          is_known_to_party?: boolean
          notes?: string | null
          // Multiloop upgrade: visibility
          dm_notes?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      faction_memberships: {
        Row: {
          id: string
          faction_id: string
          character_id: string
          role: string | null
          title: string | null
          rank: number
          joined_date: string | null
          left_date: string | null
          is_public: boolean
          is_active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          faction_id: string
          character_id: string
          role?: string | null
          title?: string | null
          rank?: number
          joined_date?: string | null
          left_date?: string | null
          is_public?: boolean
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          faction_id?: string
          character_id?: string
          role?: string | null
          title?: string | null
          rank?: number
          joined_date?: string | null
          left_date?: string | null
          is_public?: boolean
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      faction_relations: {
        Row: {
          id: string
          faction_id: string
          related_faction_id: string
          relation_type: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'war' | 'subsidiary' | 'parent'
          description: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          faction_id: string
          related_faction_id: string
          relation_type?: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'war' | 'subsidiary' | 'parent'
          description?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          faction_id?: string
          related_faction_id?: string
          relation_type?: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'war' | 'subsidiary' | 'parent'
          description?: string | null
          is_public?: boolean
          created_at?: string
        }
      }
      canvas_relationships: {
        Row: {
          id: string
          campaign_id: string
          from_character_id: string
          to_character_id: string
          template_id: string | null
          custom_label: string | null
          pair_id: string | null
          is_primary: boolean
          description: string | null
          started_date: string | null
          ended_date: string | null
          status: 'active' | 'ended' | 'complicated' | 'secret'
          is_known_to_party: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          from_character_id: string
          to_character_id: string
          template_id?: string | null
          custom_label?: string | null
          pair_id?: string | null
          is_primary?: boolean
          description?: string | null
          started_date?: string | null
          ended_date?: string | null
          status?: 'active' | 'ended' | 'complicated' | 'secret'
          is_known_to_party?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          from_character_id?: string
          to_character_id?: string
          template_id?: string | null
          custom_label?: string | null
          pair_id?: string | null
          is_primary?: boolean
          description?: string | null
          started_date?: string | null
          ended_date?: string | null
          status?: 'active' | 'ended' | 'complicated' | 'secret'
          is_known_to_party?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      // =====================================================
      // FEEDBACK SYSTEM TABLES
      // =====================================================
      feedback: {
        Row: {
          id: string
          user_id: string
          type: 'bug' | 'feature' | 'question' | 'praise'
          status: 'new' | 'reviewing' | 'in_progress' | 'fixed' | 'closed' | 'wont_fix'
          priority: 'low' | 'medium' | 'high' | 'critical' | null
          title: string
          description: string
          reproduce_steps: string | null
          expected_behavior: string | null
          actual_behavior: string | null
          frequency: 'always' | 'sometimes' | 'once' | null
          affected_area: string | null
          current_url: string | null
          current_route: string | null
          browser_info: Json | null
          screen_resolution: string | null
          viewport_size: string | null
          session_duration_seconds: number | null
          console_errors: Json | null
          network_status: string | null
          navigation_history: Json | null
          app_version: string | null
          user_email: string | null
          user_username: string | null
          user_tier: string | null
          user_role: string | null
          assigned_to: string | null
          internal_notes: string | null
          resolution_notes: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          first_response_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: 'bug' | 'feature' | 'question' | 'praise'
          status?: 'new' | 'reviewing' | 'in_progress' | 'fixed' | 'closed' | 'wont_fix'
          priority?: 'low' | 'medium' | 'high' | 'critical' | null
          title: string
          description: string
          reproduce_steps?: string | null
          expected_behavior?: string | null
          actual_behavior?: string | null
          frequency?: 'always' | 'sometimes' | 'once' | null
          affected_area?: string | null
          current_url?: string | null
          current_route?: string | null
          browser_info?: Json | null
          screen_resolution?: string | null
          viewport_size?: string | null
          session_duration_seconds?: number | null
          console_errors?: Json | null
          network_status?: string | null
          navigation_history?: Json | null
          app_version?: string | null
          user_email?: string | null
          user_username?: string | null
          user_tier?: string | null
          user_role?: string | null
          assigned_to?: string | null
          internal_notes?: string | null
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          first_response_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'bug' | 'feature' | 'question' | 'praise'
          status?: 'new' | 'reviewing' | 'in_progress' | 'fixed' | 'closed' | 'wont_fix'
          priority?: 'low' | 'medium' | 'high' | 'critical' | null
          title?: string
          description?: string
          reproduce_steps?: string | null
          expected_behavior?: string | null
          actual_behavior?: string | null
          frequency?: 'always' | 'sometimes' | 'once' | null
          affected_area?: string | null
          current_url?: string | null
          current_route?: string | null
          browser_info?: Json | null
          screen_resolution?: string | null
          viewport_size?: string | null
          session_duration_seconds?: number | null
          console_errors?: Json | null
          network_status?: string | null
          navigation_history?: Json | null
          app_version?: string | null
          user_email?: string | null
          user_username?: string | null
          user_tier?: string | null
          user_role?: string | null
          assigned_to?: string | null
          internal_notes?: string | null
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          first_response_at?: string | null
        }
      }
      feedback_attachments: {
        Row: {
          id: string
          feedback_id: string
          storage_path: string
          public_url: string
          file_name: string
          file_type: string
          file_size: number
          is_screenshot: boolean
          created_at: string
        }
        Insert: {
          id?: string
          feedback_id: string
          storage_path: string
          public_url: string
          file_name: string
          file_type: string
          file_size: number
          is_screenshot?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          feedback_id?: string
          storage_path?: string
          public_url?: string
          file_name?: string
          file_type?: string
          file_size?: number
          is_screenshot?: boolean
          created_at?: string
        }
      }
      feedback_responses: {
        Row: {
          id: string
          feedback_id: string
          user_id: string
          content: string
          is_internal: boolean
          is_status_change: boolean
          old_status: string | null
          new_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          feedback_id: string
          user_id: string
          content: string
          is_internal?: boolean
          is_status_change?: boolean
          old_status?: string | null
          new_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          feedback_id?: string
          user_id?: string
          content?: string
          is_internal?: boolean
          is_status_change?: boolean
          old_status?: string | null
          new_status?: string | null
          created_at?: string
        }
      }
      // =====================================================
      // MULTILOOP PLATFORM UPGRADE TABLES
      // =====================================================
      campaign_members: {
        Row: {
          id: string
          campaign_id: string
          user_id: string | null
          email: string | null
          discord_id: string | null
          role: 'owner' | 'co_dm' | 'player' | 'contributor' | 'guest'
          permissions: Json
          character_id: string | null
          vault_character_id: string | null
          invite_token: string | null
          invited_at: string | null
          joined_at: string | null
          status: 'pending' | 'active' | 'declined' | 'removed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id?: string | null
          email?: string | null
          discord_id?: string | null
          role?: 'owner' | 'co_dm' | 'player' | 'contributor' | 'guest'
          permissions?: Json
          character_id?: string | null
          vault_character_id?: string | null
          invite_token?: string | null
          invited_at?: string | null
          joined_at?: string | null
          status?: 'pending' | 'active' | 'declined' | 'removed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string | null
          email?: string | null
          discord_id?: string | null
          role?: 'owner' | 'co_dm' | 'player' | 'contributor' | 'guest'
          permissions?: Json
          character_id?: string | null
          vault_character_id?: string | null
          invite_token?: string | null
          invited_at?: string | null
          joined_at?: string | null
          status?: 'pending' | 'active' | 'declined' | 'removed'
          created_at?: string
          updated_at?: string
        }
      }
      player_session_notes: {
        Row: {
          id: string
          session_id: string
          character_id: string | null
          added_by_user_id: string
          attributed_to_user_id: string | null
          notes: string
          source: 'manual' | 'discord_import' | 'player_submitted'
          is_shared_with_party: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          character_id?: string | null
          added_by_user_id: string
          attributed_to_user_id?: string | null
          notes: string
          source?: 'manual' | 'discord_import' | 'player_submitted'
          is_shared_with_party?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          character_id?: string | null
          added_by_user_id?: string
          attributed_to_user_id?: string | null
          notes?: string
          source?: 'manual' | 'discord_import' | 'player_submitted'
          is_shared_with_party?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      entity_secrets: {
        Row: {
          id: string
          entity_type: 'character' | 'session' | 'timeline_event' | 'lore' | 'faction' | 'location' | 'artifact'
          entity_id: string
          field_name: string | null
          content: string
          visibility: 'dm_only' | 'party' | 'public'
          revealed_at: string | null
          revealed_in_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: 'character' | 'session' | 'timeline_event' | 'lore' | 'faction' | 'location' | 'artifact'
          entity_id: string
          field_name?: string | null
          content: string
          visibility?: 'dm_only' | 'party' | 'public'
          revealed_at?: string | null
          revealed_in_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'character' | 'session' | 'timeline_event' | 'lore' | 'faction' | 'location' | 'artifact'
          entity_id?: string
          field_name?: string | null
          content?: string
          visibility?: 'dm_only' | 'party' | 'public'
          revealed_at?: string | null
          revealed_in_session_id?: string | null
          created_at?: string
        }
      }
      map_pins: {
        Row: {
          id: string
          map_id: string
          map_type: 'campaign' | 'oneshot'
          x: number
          y: number
          label: string
          description: string | null
          icon: string | null
          color: string | null
          linked_entity_type: string | null
          linked_entity_id: string | null
          visibility: 'public' | 'party' | 'dm_only'
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          map_id: string
          map_type: 'campaign' | 'oneshot'
          x: number
          y: number
          label: string
          description?: string | null
          icon?: string | null
          color?: string | null
          linked_entity_type?: string | null
          linked_entity_id?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          map_id?: string
          map_type?: 'campaign' | 'oneshot'
          x?: number
          y?: number
          label?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          linked_entity_type?: string | null
          linked_entity_id?: string | null
          visibility?: 'public' | 'party' | 'dm_only'
          sort_order?: number
          created_at?: string
        }
      }
      dashboard_layouts: {
        Row: {
          id: string
          user_id: string
          campaign_id: string
          layout: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id: string
          layout: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string
          layout?: Json
          created_at?: string
          updated_at?: string
        }
      }
      oneshot_npcs: {
        Row: {
          id: string
          oneshot_id: string
          name: string
          description: string | null
          appearance: string | null
          personality: string | null
          motivation: string | null
          stat_block: string | null
          external_link: string | null
          image_url: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          oneshot_id: string
          name: string
          description?: string | null
          appearance?: string | null
          personality?: string | null
          motivation?: string | null
          stat_block?: string | null
          external_link?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          oneshot_id?: string
          name?: string
          description?: string | null
          appearance?: string | null
          personality?: string | null
          motivation?: string | null
          stat_block?: string | null
          external_link?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      oneshot_encounters: {
        Row: {
          id: string
          oneshot_id: string
          name: string
          description: string | null
          difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly' | null
          enemies: Json
          tactics: string | null
          terrain: string | null
          rewards: string | null
          map_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          oneshot_id: string
          name: string
          description?: string | null
          difficulty?: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly' | null
          enemies?: Json
          tactics?: string | null
          terrain?: string | null
          rewards?: string | null
          map_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          oneshot_id?: string
          name?: string
          description?: string | null
          difficulty?: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly' | null
          enemies?: Json
          tactics?: string | null
          terrain?: string | null
          rewards?: string | null
          map_id?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      oneshot_locations: {
        Row: {
          id: string
          oneshot_id: string
          name: string
          description: string | null
          features: string | null
          connected_locations: string[] | null
          map_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          oneshot_id: string
          name: string
          description?: string | null
          features?: string | null
          connected_locations?: string[] | null
          map_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          oneshot_id?: string
          name?: string
          description?: string | null
          features?: string | null
          connected_locations?: string[] | null
          map_id?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      character_snapshots: {
        Row: {
          id: string
          vault_character_id: string
          campaign_id: string
          snapshot_data: Json
          snapshot_type: 'session_0' | 'milestone' | 'manual'
          created_at: string
        }
        Insert: {
          id?: string
          vault_character_id: string
          campaign_id: string
          snapshot_data: Json
          snapshot_type?: 'session_0' | 'milestone' | 'manual'
          created_at?: string
        }
        Update: {
          id?: string
          vault_character_id?: string
          campaign_id?: string
          snapshot_data?: Json
          snapshot_type?: 'session_0' | 'milestone' | 'manual'
          created_at?: string
        }
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string
          operation_type: 'campaign_intelligence' | 'character_intelligence' | 'import' | 'merge' | 'summary' | 'other'
          model_used: string | null
          input_tokens: number | null
          output_tokens: number | null
          cost_usd: number | null
          duration_ms: number | null
          status: 'success' | 'error' | 'cancelled'
          error_message: string | null
          campaign_id: string | null
          character_id: string | null
          oneshot_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          operation_type: 'campaign_intelligence' | 'character_intelligence' | 'import' | 'merge' | 'summary' | 'other'
          model_used?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          duration_ms?: number | null
          status?: 'success' | 'error' | 'cancelled'
          error_message?: string | null
          campaign_id?: string | null
          character_id?: string | null
          oneshot_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          operation_type?: 'campaign_intelligence' | 'character_intelligence' | 'import' | 'merge' | 'summary' | 'other'
          model_used?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          duration_ms?: number | null
          status?: 'success' | 'error' | 'cancelled'
          error_message?: string | null
          campaign_id?: string | null
          character_id?: string | null
          oneshot_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      ai_cooldowns: {
        Row: {
          id: string
          user_id: string
          cooldown_type: 'campaign_intelligence' | 'character_intelligence'
          entity_id: string | null
          last_run_at: string
          next_available_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cooldown_type: 'campaign_intelligence' | 'character_intelligence'
          entity_id?: string | null
          last_run_at: string
          next_available_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cooldown_type?: 'campaign_intelligence' | 'character_intelligence'
          entity_id?: string | null
          last_run_at?: string
          next_available_at?: string
          created_at?: string
        }
      }
      ai_suggestion_feedback: {
        Row: {
          id: string
          user_id: string
          usage_log_id: string | null
          suggestion_type: string
          suggestion_content: string | null
          action_taken: 'accepted' | 'edited' | 'dismissed'
          feedback: 'positive' | 'negative' | null
          edit_details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          usage_log_id?: string | null
          suggestion_type: string
          suggestion_content?: string | null
          action_taken: 'accepted' | 'edited' | 'dismissed'
          feedback?: 'positive' | 'negative' | null
          edit_details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          usage_log_id?: string | null
          suggestion_type?: string
          suggestion_content?: string | null
          action_taken?: 'accepted' | 'edited' | 'dismissed'
          feedback?: 'positive' | 'negative' | null
          edit_details?: string | null
          created_at?: string
        }
      }
      import_sessions: {
        Row: {
          id: string
          user_id: string
          import_type: 'pdf' | 'image' | 'text'
          target_type: 'vault_character' | 'campaign_character' | 'oneshot' | 'campaign'
          status: 'started' | 'parsed' | 'reviewed' | 'saved' | 'cancelled'
          usage_log_id: string | null
          file_size_bytes: number | null
          parse_duration_ms: number | null
          started_at: string
          parsed_at: string | null
          reviewed_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          import_type: 'pdf' | 'image' | 'text'
          target_type: 'vault_character' | 'campaign_character' | 'oneshot' | 'campaign'
          status?: 'started' | 'parsed' | 'reviewed' | 'saved' | 'cancelled'
          usage_log_id?: string | null
          file_size_bytes?: number | null
          parse_duration_ms?: number | null
          started_at?: string
          parsed_at?: string | null
          reviewed_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          import_type?: 'pdf' | 'image' | 'text'
          target_type?: 'vault_character' | 'campaign_character' | 'oneshot' | 'campaign'
          status?: 'started' | 'parsed' | 'reviewed' | 'saved' | 'cancelled'
          usage_log_id?: string | null
          file_size_bytes?: number | null
          parse_duration_ms?: number | null
          started_at?: string
          parsed_at?: string | null
          reviewed_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      ai_tier_settings: {
        Row: {
          id: string
          tier: 'adventurer' | 'hero' | 'legend'
          campaign_intelligence_cooldown_hours: number
          character_intelligence_cooldown_hours: number
          import_limit_per_day: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          tier: 'adventurer' | 'hero' | 'legend'
          campaign_intelligence_cooldown_hours?: number
          character_intelligence_cooldown_hours?: number
          import_limit_per_day?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          tier?: 'adventurer' | 'hero' | 'legend'
          campaign_intelligence_cooldown_hours?: number
          character_intelligence_cooldown_hours?: number
          import_limit_per_day?: number | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      user_guidance_state: {
        Row: {
          id: string
          user_id: string
          dismissed_tips: string[]
          completed_onboarding: string[]
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dismissed_tips?: string[]
          completed_onboarding?: string[]
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dismissed_tips?: string[]
          completed_onboarding?: string[]
          last_updated?: string
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
export type CampaignEra = Database['public']['Tables']['campaign_eras']['Row']
export type WorldMap = Database['public']['Tables']['world_maps']['Row']
export type MediaItem = Database['public']['Tables']['media_gallery']['Row']
export type CharacterVersion = Database['public']['Tables']['character_versions']['Row']
export type VaultCharacter = Database['public']['Tables']['vault_characters']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type StoryCharacter = Database['public']['Tables']['story_characters']['Row']
export type PlayJournal = Database['public']['Tables']['play_journal']['Row']
export type PlayJournalAttendee = Database['public']['Tables']['play_journal_attendees']['Row']
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
export type RunSession = Database['public']['Tables']['run_sessions']['Row']
export type CharacterRelationship = Database['public']['Tables']['character_relationships']['Row']
export type CampaignLore = Database['public']['Tables']['campaign_lore']['Row']
export type CampaignShare = Database['public']['Tables']['campaign_shares']['Row']
export type ShareViewEvent = Database['public']['Tables']['share_view_events']['Row']
export type IntelligenceSuggestion = Database['public']['Tables']['intelligence_suggestions']['Row']

// User tier type (renamed from free/standard/premium to adventurer/hero/legend)
export type UserTier = 'adventurer' | 'hero' | 'legend'
export type UserRole = 'user' | 'moderator' | 'super_admin'

// Helper to check if a tier has AI access
export const TIER_HAS_AI: Record<UserTier, boolean> = {
  adventurer: false,
  hero: true,
  legend: true,
}

// Role-based permissions
export const ROLE_PERMISSIONS = {
  user: [] as const,
  moderator: ['view_users', 'suspend_users', 'view_analytics'] as const,
  super_admin: ['view_users', 'suspend_users', 'disable_users', 'change_tiers', 'change_roles', 'view_analytics', 'manage_changelog'] as const,
} as const

export type Permission = typeof ROLE_PERMISSIONS[UserRole][number]

// Type exports for new tables
export type Changelog = Database['public']['Tables']['changelog']['Row']
export type AdminActivityLog = Database['public']['Tables']['admin_activity_log']['Row']

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

// Template system types
export type TemplateSnapshot = Database['public']['Tables']['template_snapshots']['Row']
export type ContentSave = Database['public']['Tables']['content_saves']['Row']

// Content mode type for filtering
export type ContentMode = 'active' | 'inactive'

// Inactive reason types per content type
export type CampaignInactiveReason = 'completed' | 'on_hiatus' | 'retired'
export type CharacterInactiveReason = 'retired' | 'deceased' | 'on_hiatus'
export type OneshotInactiveReason = 'completed' | 'archived'

// Content save with snapshot data for display
export type ContentSaveWithSnapshot = ContentSave & {
  snapshot?: TemplateSnapshot
}

// Campaign Tags & Relationships System types
export type RelationshipTemplate = Database['public']['Tables']['relationship_templates']['Row']
export type CampaignFaction = Database['public']['Tables']['campaign_factions']['Row']
export type FactionMembership = Database['public']['Tables']['faction_memberships']['Row']
export type FactionRelation = Database['public']['Tables']['faction_relations']['Row']
export type CanvasRelationship = Database['public']['Tables']['canvas_relationships']['Row']

// Relationship mode type
export type RelationshipMode = 'symmetric' | 'asymmetric' | 'one_way'

// Relationship category type
export type RelationshipCategory = 'family' | 'professional' | 'romantic' | 'conflict' | 'social' | 'other'

// Faction type
export type FactionType = 'guild' | 'kingdom' | 'cult' | 'family' | 'military' | 'criminal' | 'religious' | 'merchant' | 'academic' | 'other'

// Faction status
export type FactionStatus = 'active' | 'disbanded' | 'secret' | 'destroyed'

// Faction relation type
export type FactionRelationType = 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'war' | 'subsidiary' | 'parent'

// Canvas relationship status
export type CanvasRelationshipStatus = 'active' | 'ended' | 'complicated' | 'secret'

// Extended types with relations
export type CampaignFactionWithMembers = CampaignFaction & {
  memberships: (FactionMembership & { character: Character })[]
  parent_faction?: CampaignFaction | null
  child_factions: CampaignFaction[]
  relations: (FactionRelation & { related_faction: CampaignFaction })[]
}

export type CanvasRelationshipWithDetails = CanvasRelationship & {
  template?: RelationshipTemplate | null
  from_character: Character
  to_character: Character
}

export type CharacterWithFactions = Character & {
  faction_memberships: (FactionMembership & { faction: CampaignFaction })[]
}

export type CharacterWithRelationships = Character & {
  outgoing_relationships: CanvasRelationshipWithDetails[]
  incoming_relationships: CanvasRelationshipWithDetails[]
}

// =====================================================
// FEEDBACK SYSTEM TYPES
// =====================================================

// Base types
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert']
export type FeedbackUpdate = Database['public']['Tables']['feedback']['Update']
export type FeedbackAttachment = Database['public']['Tables']['feedback_attachments']['Row']
export type FeedbackResponse = Database['public']['Tables']['feedback_responses']['Row']

// Type aliases for enum-like values
export type FeedbackType = 'bug' | 'feature' | 'question' | 'praise'
export type FeedbackStatus = 'new' | 'reviewing' | 'in_progress' | 'fixed' | 'closed' | 'wont_fix'
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical'
export type FeedbackFrequency = 'always' | 'sometimes' | 'once'

// Context capture types
export interface BrowserInfo {
  name: string
  version: string
  os: string
  osVersion: string
  device: 'desktop' | 'mobile' | 'tablet'
  userAgent: string
}

export interface ConsoleError {
  message: string
  source?: string
  lineno?: number
  colno?: number
  timestamp: string
  stack?: string
}

export interface NavigationEntry {
  url: string
  title: string
  timestamp: string
}

// Extended feedback with attachments and responses
export type FeedbackWithDetails = Feedback & {
  attachments: FeedbackAttachment[]
  responses: FeedbackResponse[]
}

// For admin list display
export type FeedbackListItem = Feedback & {
  response_count: number
}

// =====================================================
// MULTILOOP PLATFORM UPGRADE TYPES
// =====================================================

// Campaign collaboration types
export type CampaignMember = Database['public']['Tables']['campaign_members']['Row']
export type CampaignMemberInsert = Database['public']['Tables']['campaign_members']['Insert']
export type CampaignMemberUpdate = Database['public']['Tables']['campaign_members']['Update']
export type CampaignMemberRole = 'owner' | 'co_dm' | 'player' | 'contributor' | 'guest'
export type CampaignMemberStatus = 'pending' | 'active' | 'declined' | 'removed'

// Member permissions - granular per-member access control
export interface MemberPermissions {
  // Session Notes
  sessionNotes: {
    addOwn: boolean
    viewRecaps: boolean
    viewOthers: boolean
    editOthers: boolean
  }
  // Characters
  characters: {
    editOwn: boolean
    viewParty: boolean
    viewPartyDetails: boolean
    editParty: boolean
  }
  // NPCs
  npcs: {
    view: boolean
    viewDetails: boolean
    add: boolean
    edit: boolean
    delete: boolean
    viewRelationships: boolean
    editRelationships: boolean
  }
  // Timeline
  timeline: {
    view: boolean
    viewFuture: boolean
    add: boolean
    edit: boolean
    delete: boolean
  }
  // World Building - Factions
  factions: {
    view: boolean
    add: boolean
    edit: boolean
    delete: boolean
  }
  // World Building - Locations
  locations: {
    view: boolean
    add: boolean
    edit: boolean
    delete: boolean
  }
  // World Building - Lore
  lore: {
    view: boolean
    add: boolean
    edit: boolean
    delete: boolean
  }
  // Maps
  maps: {
    view: boolean
    add: boolean
    delete: boolean
  }
  // Map Pins
  mapPins: {
    view: boolean
    add: boolean
    edit: boolean
    delete: boolean
  }
  // Gallery
  gallery: {
    view: boolean
    add: boolean
    delete: boolean
  }
  // Canvas
  canvas: {
    view: boolean
    editLayout: boolean
  }
  // Sessions (records)
  sessions: {
    view: boolean
    add: boolean
    edit: boolean
    delete: boolean
  }
  // Secrets & Visibility
  secrets: {
    viewPartyItems: boolean
    viewRevealHistory: boolean
  }
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<CampaignMemberRole, MemberPermissions> = {
  owner: {
    sessionNotes: { addOwn: true, viewRecaps: true, viewOthers: true, editOthers: true },
    characters: { editOwn: true, viewParty: true, viewPartyDetails: true, editParty: true },
    npcs: { view: true, viewDetails: true, add: true, edit: true, delete: true, viewRelationships: true, editRelationships: true },
    timeline: { view: true, viewFuture: true, add: true, edit: true, delete: true },
    factions: { view: true, add: true, edit: true, delete: true },
    locations: { view: true, add: true, edit: true, delete: true },
    lore: { view: true, add: true, edit: true, delete: true },
    maps: { view: true, add: true, delete: true },
    mapPins: { view: true, add: true, edit: true, delete: true },
    gallery: { view: true, add: true, delete: true },
    canvas: { view: true, editLayout: true },
    sessions: { view: true, add: true, edit: true, delete: true },
    secrets: { viewPartyItems: true, viewRevealHistory: true },
  },
  co_dm: {
    sessionNotes: { addOwn: true, viewRecaps: true, viewOthers: true, editOthers: true },
    characters: { editOwn: true, viewParty: true, viewPartyDetails: true, editParty: true },
    npcs: { view: true, viewDetails: true, add: true, edit: true, delete: true, viewRelationships: true, editRelationships: true },
    timeline: { view: true, viewFuture: true, add: true, edit: true, delete: true },
    factions: { view: true, add: true, edit: true, delete: true },
    locations: { view: true, add: true, edit: true, delete: true },
    lore: { view: true, add: true, edit: true, delete: true },
    maps: { view: true, add: true, delete: true },
    mapPins: { view: true, add: true, edit: true, delete: true },
    gallery: { view: true, add: true, delete: true },
    canvas: { view: true, editLayout: true },
    sessions: { view: true, add: true, edit: true, delete: true },
    secrets: { viewPartyItems: true, viewRevealHistory: true },
  },
  player: {
    sessionNotes: { addOwn: true, viewRecaps: true, viewOthers: true, editOthers: false },
    characters: { editOwn: true, viewParty: true, viewPartyDetails: false, editParty: false },
    npcs: { view: true, viewDetails: false, add: false, edit: false, delete: false, viewRelationships: false, editRelationships: false },
    timeline: { view: true, viewFuture: false, add: false, edit: false, delete: false },
    factions: { view: true, add: false, edit: false, delete: false },
    locations: { view: true, add: false, edit: false, delete: false },
    lore: { view: false, add: false, edit: false, delete: false },
    maps: { view: true, add: false, delete: false },
    mapPins: { view: true, add: false, edit: false, delete: false },
    gallery: { view: true, add: false, delete: false },
    canvas: { view: true, editLayout: false },
    sessions: { view: true, add: false, edit: false, delete: false },
    secrets: { viewPartyItems: true, viewRevealHistory: true },
  },
  contributor: {
    sessionNotes: { addOwn: true, viewRecaps: true, viewOthers: true, editOthers: false },
    characters: { editOwn: false, viewParty: true, viewPartyDetails: false, editParty: false },
    npcs: { view: false, viewDetails: false, add: false, edit: false, delete: false, viewRelationships: false, editRelationships: false },
    timeline: { view: true, viewFuture: false, add: false, edit: false, delete: false },
    factions: { view: false, add: false, edit: false, delete: false },
    locations: { view: false, add: false, edit: false, delete: false },
    lore: { view: false, add: false, edit: false, delete: false },
    maps: { view: false, add: false, delete: false },
    mapPins: { view: false, add: false, edit: false, delete: false },
    gallery: { view: false, add: false, delete: false },
    canvas: { view: false, editLayout: false },
    sessions: { view: true, add: false, edit: false, delete: false },
    secrets: { viewPartyItems: false, viewRevealHistory: false },
  },
  guest: {
    sessionNotes: { addOwn: false, viewRecaps: true, viewOthers: false, editOthers: false },
    characters: { editOwn: false, viewParty: true, viewPartyDetails: false, editParty: false },
    npcs: { view: false, viewDetails: false, add: false, edit: false, delete: false, viewRelationships: false, editRelationships: false },
    timeline: { view: true, viewFuture: false, add: false, edit: false, delete: false },
    factions: { view: false, add: false, edit: false, delete: false },
    locations: { view: false, add: false, edit: false, delete: false },
    lore: { view: false, add: false, edit: false, delete: false },
    maps: { view: false, add: false, delete: false },
    mapPins: { view: false, add: false, edit: false, delete: false },
    gallery: { view: false, add: false, delete: false },
    canvas: { view: true, editLayout: false },
    sessions: { view: true, add: false, edit: false, delete: false },
    secrets: { viewPartyItems: false, viewRevealHistory: false },
  },
}

// Player session notes
export type PlayerSessionNote = Database['public']['Tables']['player_session_notes']['Row']
export type PlayerSessionNoteInsert = Database['public']['Tables']['player_session_notes']['Insert']
export type PlayerSessionNoteUpdate = Database['public']['Tables']['player_session_notes']['Update']
export type NoteSource = 'manual' | 'discord_import' | 'player_submitted' | 'whatsapp_import' | 'email_import' | 'other_import' | 'dm_added'

// Entity secrets (visibility system)
export type EntitySecret = Database['public']['Tables']['entity_secrets']['Row']
export type EntitySecretInsert = Database['public']['Tables']['entity_secrets']['Insert']
export type EntitySecretUpdate = Database['public']['Tables']['entity_secrets']['Update']
export type SecretEntityType = 'character' | 'session' | 'timeline_event' | 'lore' | 'faction' | 'location' | 'artifact'
export type VisibilityLevel = 'dm_only' | 'party' | 'public'

// Map pins (interactive maps)
export type MapPin = Database['public']['Tables']['map_pins']['Row']
export type MapPinInsert = Database['public']['Tables']['map_pins']['Insert']
export type MapPinUpdate = Database['public']['Tables']['map_pins']['Update']
export type MapType = 'campaign' | 'oneshot'

// Dashboard layouts
export type DashboardLayout = Database['public']['Tables']['dashboard_layouts']['Row']
export type DashboardLayoutInsert = Database['public']['Tables']['dashboard_layouts']['Insert']
export type DashboardLayoutUpdate = Database['public']['Tables']['dashboard_layouts']['Update']

// Oneshot structured content
export type OneshotNpc = Database['public']['Tables']['oneshot_npcs']['Row']
export type OneshotNpcInsert = Database['public']['Tables']['oneshot_npcs']['Insert']
export type OneshotNpcUpdate = Database['public']['Tables']['oneshot_npcs']['Update']

export type OneshotEncounter = Database['public']['Tables']['oneshot_encounters']['Row']
export type OneshotEncounterInsert = Database['public']['Tables']['oneshot_encounters']['Insert']
export type OneshotEncounterUpdate = Database['public']['Tables']['oneshot_encounters']['Update']
export type EncounterDifficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly'

export type OneshotLocation = Database['public']['Tables']['oneshot_locations']['Row']
export type OneshotLocationInsert = Database['public']['Tables']['oneshot_locations']['Insert']
export type OneshotLocationUpdate = Database['public']['Tables']['oneshot_locations']['Update']

// Character snapshots (Session 0 preservation)
export type CharacterSnapshot = Database['public']['Tables']['character_snapshots']['Row']
export type CharacterSnapshotInsert = Database['public']['Tables']['character_snapshots']['Insert']
export type CharacterSnapshotUpdate = Database['public']['Tables']['character_snapshots']['Update']
export type SnapshotType = 'session_0' | 'milestone' | 'manual'

// AI usage tracking
export type AiUsageLog = Database['public']['Tables']['ai_usage_logs']['Row']
export type AiUsageLogInsert = Database['public']['Tables']['ai_usage_logs']['Insert']
export type AiUsageLogUpdate = Database['public']['Tables']['ai_usage_logs']['Update']
export type AiOperationType = 'campaign_intelligence' | 'character_intelligence' | 'import' | 'merge' | 'summary' | 'other'
export type AiOperationStatus = 'success' | 'error' | 'cancelled'

// AI cooldowns
export type AiCooldown = Database['public']['Tables']['ai_cooldowns']['Row']
export type AiCooldownInsert = Database['public']['Tables']['ai_cooldowns']['Insert']
export type AiCooldownUpdate = Database['public']['Tables']['ai_cooldowns']['Update']
export type CooldownType = 'campaign_intelligence' | 'character_intelligence'

// AI suggestion feedback
export type AiSuggestionFeedback = Database['public']['Tables']['ai_suggestion_feedback']['Row']
export type AiSuggestionFeedbackInsert = Database['public']['Tables']['ai_suggestion_feedback']['Insert']
export type AiSuggestionFeedbackUpdate = Database['public']['Tables']['ai_suggestion_feedback']['Update']
export type SuggestionAction = 'accepted' | 'edited' | 'dismissed'
export type SuggestionFeedback = 'positive' | 'negative'

// Import sessions (funnel tracking)
export type ImportSession = Database['public']['Tables']['import_sessions']['Row']
export type ImportSessionInsert = Database['public']['Tables']['import_sessions']['Insert']
export type ImportSessionUpdate = Database['public']['Tables']['import_sessions']['Update']
export type ImportType = 'pdf' | 'image' | 'text'
export type ImportTargetType = 'vault_character' | 'campaign_character' | 'oneshot' | 'campaign'
export type ImportStatus = 'started' | 'parsed' | 'reviewed' | 'saved' | 'cancelled'

// AI tier settings
export type AiTierSettings = Database['public']['Tables']['ai_tier_settings']['Row']
export type AiTierSettingsInsert = Database['public']['Tables']['ai_tier_settings']['Insert']
export type AiTierSettingsUpdate = Database['public']['Tables']['ai_tier_settings']['Update']

// User guidance state
export type UserGuidanceState = Database['public']['Tables']['user_guidance_state']['Row']
export type UserGuidanceStateInsert = Database['public']['Tables']['user_guidance_state']['Insert']
export type UserGuidanceStateUpdate = Database['public']['Tables']['user_guidance_state']['Update']

// Session workflow types
export type SessionPhase = 'prep' | 'live' | 'completed'

// Session workflow section types
export type SessionSection = 'prep_checklist' | 'thoughts_for_next' | 'quick_reference' | 'session_timer'

// Prep checklist item
export interface PrepChecklistItem {
  id: string
  text: string
  checked: boolean
}

// Session timer state
export interface SessionTimerState {
  started_at: string | null
  paused_at: string | null
  elapsed_seconds: number
  breaks: Array<{ start: string; end: string | null }>
}

// Pinned reference for quick access
export interface PinnedReference {
  entity_type: 'character' | 'npc' | 'location' | 'lore' | 'faction'
  entity_id: string
  label: string
}

// Session attendee tracking
export interface SessionAttendee {
  character_id: string
  status: 'attended' | 'absent' | 'late'
}

// Default prep checklist item (for campaign settings)
export interface DefaultPrepChecklistItem {
  id: string
  text: string
  default_checked: boolean
}

// Extended types with relations
export type CampaignMemberWithUser = CampaignMember & {
  user_settings?: UserSettings | null
  character?: Character | null
  vault_character?: VaultCharacter | null
}

export type SessionWithPlayerNotes = Session & {
  player_notes: PlayerSessionNote[]
}

export type OneshotWithStructuredContent = Oneshot & {
  npcs: OneshotNpc[]
  encounters: OneshotEncounter[]
  locations: OneshotLocation[]
}

export type CampaignWithMembers = Campaign & {
  members: CampaignMemberWithUser[]
}

// AI admin dashboard types
export interface AiUsageStats {
  totalCalls: number
  callsByType: Record<AiOperationType, number>
  callsByModel: Record<string, number>
  totalCost: number
  averageDuration: number
  errorRate: number
}

export interface ImportFunnelStats {
  started: number
  parsed: number
  reviewed: number
  saved: number
  cancelled: number
  completionRate: number
  averageCost: number
}

export interface SuggestionEffectivenessStats {
  totalSuggestions: number
  accepted: number
  edited: number
  dismissed: number
  acceptanceRate: number
  positiveRatio: number
  negativeRatio: number
}
