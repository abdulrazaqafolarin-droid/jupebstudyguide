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
      activation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_used: boolean
          plan_type: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          plan_type?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          plan_type?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      ai_api_keys: {
        Row: {
          api_key: string
          // PENDING MIGRATION: see supabase/pending-migrations.sql (not yet applied live)
          provider: string
          last_error: string | null
          consecutive_failures: number
          cooldown_until: string | null
          created_at: string
          exhausted_at: string | null
          id: string
          is_active: boolean
          key_preview: string
          label: string
          last_used_at: string | null
          priority: number
          token_exhausted: boolean
          total_requests: number
          total_tokens_used: number
        }
        Insert: {
          api_key: string
          provider?: string
          last_error?: string | null
          consecutive_failures?: number
          cooldown_until?: string | null
          created_at?: string
          exhausted_at?: string | null
          id?: string
          is_active?: boolean
          key_preview: string
          label: string
          last_used_at?: string | null
          priority?: number
          token_exhausted?: boolean
          total_requests?: number
          total_tokens_used?: number
        }
        Update: {
          api_key?: string
          provider?: string
          last_error?: string | null
          consecutive_failures?: number
          cooldown_until?: string | null
          created_at?: string
          exhausted_at?: string | null
          id?: string
          is_active?: boolean
          key_preview?: string
          label?: string
          last_used_at?: string | null
          priority?: number
          token_exhausted?: boolean
          total_requests?: number
          total_tokens_used?: number
        }
        Relationships: []
      }
      ai_api_keys_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          attachment: Json | null
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachment?: Json | null
          chat_id: string
          content?: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachment?: Json | null
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chats: {
        Row: {
          created_at: string
          id: string
          subject: string | null
          subtopic: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject?: string | null
          subtopic?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject?: string | null
          subtopic?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          completion_tokens: number
          created_at: string
          error_message: string | null
          feature: string
          id: string
          key_id: string | null
          model: string | null
          prompt_tokens: number
          status: string
          total_tokens: number
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          error_message?: string | null
          feature: string
          id?: string
          key_id?: string | null
          model?: string | null
          prompt_tokens?: number
          status?: string
          total_tokens?: number
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          key_id?: string | null
          model?: string | null
          prompt_tokens?: number
          status?: string
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "ai_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_images: {
        Row: {
          answer_text: string | null
          created_at: string
          id: string
          image_url: string
          question_id: string
          subject: string
          user_id: string
          year: number | null
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          question_id: string
          subject: string
          user_id: string
          year?: number | null
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          question_id?: string
          subject?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      answer_markings: {
        Row: {
          answer_text: string | null
          corrections: string | null
          feedback: string | null
          id: string
          image_url: string | null
          marked_at: string
          question_id: string
          score: number | null
          strengths: string | null
          subject: string
          user_id: string
          weaknesses: string | null
        }
        Insert: {
          answer_text?: string | null
          corrections?: string | null
          feedback?: string | null
          id?: string
          image_url?: string | null
          marked_at?: string
          question_id: string
          score?: number | null
          strengths?: string | null
          subject: string
          user_id: string
          weaknesses?: string | null
        }
        Update: {
          answer_text?: string | null
          corrections?: string | null
          feedback?: string | null
          id?: string
          image_url?: string | null
          marked_at?: string
          question_id?: string
          score?: number | null
          strengths?: string | null
          subject?: string
          user_id?: string
          weaknesses?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_keys: {
        Row: {
          conversation_id: string
          encrypted_key: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          encrypted_key: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          encrypted_key?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          group_avatar: string | null
          group_name: string | null
          id: string
          messages_policy: string
          unread_count_a: number
          unread_count_b: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_avatar?: string | null
          group_name?: string | null
          id?: string
          messages_policy?: string
          unread_count_a?: number
          unread_count_b?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_avatar?: string | null
          group_name?: string | null
          id?: string
          messages_policy?: string
          unread_count_a?: number
          unread_count_b?: number
          updated_at?: string
        }
        Relationships: []
      }
      custom_questions: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: string | null
          document_name: string
          explanation: string
          id: string
          options: Json | null
          question: string
          question_type: string
          subject: string
          topic: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          document_name: string
          explanation: string
          id?: string
          options?: Json | null
          question: string
          question_type?: string
          subject: string
          topic?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          document_name?: string
          explanation?: string
          id?: string
          options?: Json | null
          question?: string
          question_type?: string
          subject?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_weeks: {
        Row: {
          champion_badge_awarded: boolean
          champion_user_id: string | null
          created_at: string
          id: string
          week_end: string
          week_start: string
        }
        Insert: {
          champion_badge_awarded?: boolean
          champion_user_id?: string | null
          created_at?: string
          id?: string
          week_end: string
          week_start: string
        }
        Update: {
          champion_badge_awarded?: boolean
          champion_user_id?: string | null
          created_at?: string
          id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_weeks_champion_user_id_fkey"
            columns: ["champion_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          // PENDING MIGRATION: see supabase/pending-migrations.sql (not yet applied live)
          client_msg_id: string | null
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          expires_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          forwarded_from: Json | null
          group_name: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_edited: boolean
          is_read: boolean
          message_type: string
          reactions: Json
          read_at: string | null
          reply_to_id: string | null
          screenshot_attempts: number
          sender_id: string
          upload_progress: number | null
          view_once: boolean
        }
        Insert: {
          client_msg_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          forwarded_from?: Json | null
          group_name?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_edited?: boolean
          is_read?: boolean
          message_type?: string
          reactions?: Json
          read_at?: string | null
          reply_to_id?: string | null
          screenshot_attempts?: number
          sender_id: string
          upload_progress?: number | null
          view_once?: boolean
        }
        Update: {
          client_msg_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          forwarded_from?: Json | null
          group_name?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_edited?: boolean
          is_read?: boolean
          message_type?: string
          reactions?: Json
          read_at?: string | null
          reply_to_id?: string | null
          screenshot_attempts?: number
          sender_id?: string
          upload_progress?: number | null
          view_once?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_conversations: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muted_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      // PENDING MIGRATION: table does not exist live yet — see supabase/pending-migrations.sql
      notification_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: Json
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_activated: boolean
          is_admin: boolean
          last_seen_at: string | null
          // PENDING MIGRATION: see supabase/pending-migrations.sql (not yet applied live)
          mfa_enrolled: boolean
          mfa_enrolled_at: string | null
          privacy_activity_status: string
          privacy_avatar: string
          privacy_groups: string
          privacy_last_seen: string
          privacy_online_status: string
          privacy_profile: string
          privacy_read_receipts: string
          public_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: Json
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_activated?: boolean
          is_admin?: boolean
          last_seen_at?: string | null
          mfa_enrolled?: boolean
          mfa_enrolled_at?: string | null
          privacy_activity_status?: string
          privacy_avatar?: string
          privacy_groups?: string
          privacy_last_seen?: string
          privacy_online_status?: string
          privacy_profile?: string
          privacy_read_receipts?: string
          public_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: Json
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_activated?: boolean
          is_admin?: boolean
          last_seen_at?: string | null
          mfa_enrolled?: boolean
          mfa_enrolled_at?: string | null
          privacy_activity_status?: string
          privacy_avatar?: string
          privacy_groups?: string
          privacy_last_seen?: string
          privacy_online_status?: string
          privacy_profile?: string
          privacy_read_receipts?: string
          public_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      score_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      study_questions: {
        Row: {
          category: string
          correct_answer: string | null
          course: string | null
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          hidden: boolean
          id: string
          image_position: string | null
          image_url: string | null
          options: Json | null
          question: string | null
          sort_order: number | null
          subject: string
          year: number
        }
        Insert: {
          category: string
          correct_answer?: string | null
          course?: string | null
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          hidden?: boolean
          id: string
          image_position?: string | null
          image_url?: string | null
          options?: Json | null
          question?: string | null
          sort_order?: number | null
          subject: string
          year: number
        }
        Update: {
          category?: string
          correct_answer?: string | null
          course?: string | null
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          hidden?: boolean
          id?: string
          image_position?: string | null
          image_url?: string | null
          options?: Json | null
          question?: string | null
          sort_order?: number | null
          subject?: string
          year?: number
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          created_at: string
          id: string
          local_date: string
          mission: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_date: string
          mission: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          local_date?: string
          mission?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          sessions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sessions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          sessions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      // PENDING MIGRATION: table does not exist live yet — see supabase/pending-migrations.sql
      syllabus_progress: {
        Row: {
          created_at: string
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_migration: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      textbook_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          textbook_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          textbook_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          textbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "textbook_chunks_textbook_id_fkey"
            columns: ["textbook_id"]
            isOneToOne: false
            referencedRelation: "textbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      textbooks: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          level: string | null
          subject: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          level?: string | null
          subject?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          level?: string | null
          subject?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          achievements_count: number
          created_at: string
          id: string
          mastery_avg: number
          streak_days: number
          syllabus_completed_days: number
          total_score: number
          total_score_accumulated: number
          updated_at: string
          user_id: string
          week_score: number
        }
        Insert: {
          achievements_count?: number
          created_at?: string
          id?: string
          mastery_avg?: number
          streak_days?: number
          syllabus_completed_days?: number
          total_score?: number
          total_score_accumulated?: number
          updated_at?: string
          user_id: string
          week_score?: number
        }
        Update: {
          achievements_count?: number
          created_at?: string
          id?: string
          mastery_avg?: number
          streak_days?: number
          syllabus_completed_days?: number
          total_score?: number
          total_score_accumulated?: number
          updated_at?: string
          user_id?: string
          week_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      current_leaderboard: {
        Row: {
          event_count: number | null
          last_event_at: string | null
          user_id: string | null
          week_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "score_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      admin_delete_question: { Args: { p_question_id: string }; Returns: Json }
      auto_weekly_champion: { Args: never; Returns: undefined }
      award_score: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      block_user: { Args: { p_blocked_id: string }; Returns: undefined }
      can_add_to_group: { Args: { p_target_user_id: string }; Returns: boolean }
      can_message_user: { Args: { p_target_user_id: string }; Returns: boolean }
      can_view_last_seen: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      // PENDING REGEN: added by migration 20261011000003 (regenerate types to refresh)
      can_view_online_status_many: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          allowed: boolean
        }[]
      }
      can_view_online_status: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { target_user_id: string }; Returns: boolean }
      can_view_profile_photo: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_view_read_receipts: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      consume_activation_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      current_week_end: { Args: never; Returns: string }
      current_week_start: { Args: never; Returns: string }
      delete_expired_messages: { Args: never; Returns: number }
      delete_my_account: { Args: never; Returns: undefined }
      find_or_create_dm: { Args: { other_user_id: string }; Returns: Json }
      generate_activation_codes: {
        Args: {
          p_admin_email?: string
          p_count?: number
          p_created_by: string
          p_plan_type?: string
        }
        Returns: {
          code: string
          expires_at: string
          plan_type: string
        }[]
      }
      get_admin_dashboard_stats: {
        Args: { p_admin_email?: string }
        Returns: Json
      }
      get_ai_usage_summary: { Args: { p_admin_email: string }; Returns: Json }
      get_blocked_users: {
        Args: never
        Returns: {
          blocked_at: string
          blocked_id: string
        }[]
      }
      get_config: { Args: { p_key: string }; Returns: string }
      get_friends: {
        Args: { user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          friend_id: string
        }[]
      }
      get_last_seen: { Args: { p_target_user_id: string }; Returns: string }
      get_mutual_friends: {
        Args: { user_a: string; user_b: string }
        Returns: {
          avatar_url: string
          display_name: string
          friend_id: string
        }[]
      }
      get_my_muted_conversations: {
        Args: never
        Returns: {
          conversation_id: string
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: string
      }
      get_relationship_status: {
        Args: { user_a: string; user_b: string }
        Returns: string
      }
      get_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: number
      }
      get_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          count: number
        }[]
      }
      get_weekly_leaderboard: {
        Args: { p_week_start?: string }
        Returns: {
          avatar_url: string
          display_name: string
          event_count: number
          rank: number
          user_id: string
          week_score: number
        }[]
      }
      handle_friend_request: {
        Args: { accept: boolean; request_id: string }
        Returns: Json
      }
      increment_key_stats: {
        Args: { p_key_id: string; p_token_count: number }
        Returns: undefined
      }
      insert_group_system_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_message_type: string
        }
        Returns: undefined
      }
      is_admin_email: { Args: never; Returns: boolean }
      is_blocked: { Args: { p_target_user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_muted: { Args: { p_conversation_id: string }; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: Json
      }
      match_textbook_chunks: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          textbook_id: string
          textbook_title: string
        }[]
      }
      report_user: {
        Args: {
          p_description?: string
          p_reason: string
          p_reported_user_id: string
        }
        Returns: string
      }
      send_friend_request: { Args: { receiver_id: string }; Returns: Json }
      toggle_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: Json
      }
      toggle_mute_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      unblock_user: { Args: { p_blocked_id: string }; Returns: undefined }
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
