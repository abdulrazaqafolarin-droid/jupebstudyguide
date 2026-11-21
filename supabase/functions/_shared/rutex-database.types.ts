export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Generated from live Rutex schema after migration 20261117215633. */
export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
        exam_attempt_answers: {
          Row: {
            answered_at: string | null
            attempt_id: string
            marked_for_review: boolean
            question_sequence: number
            selected_option: string | null
            updated_at: string
          }
          Insert: {
            answered_at?: string | null
            attempt_id: string
            marked_for_review?: boolean
            question_sequence: number
            selected_option?: string | null
            updated_at?: string
          }
          Update: {
            answered_at?: string | null
            attempt_id?: string
            marked_for_review?: boolean
            question_sequence?: number
            selected_option?: string | null
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_attempt_answers_attempt_id_question_sequence_fkey"
              columns: ["attempt_id", "question_sequence"]
              isOneToOne: true
              referencedRelation: "exam_attempt_questions"
              referencedColumns: ["attempt_id", "sequence"]
            },
          ]
        }
        exam_attempt_questions: {
          Row: {
            attempt_id: string
            question_id: string
            question_snapshot: Json
            sequence: number
            subject_code: string
          }
          Insert: {
            attempt_id: string
            question_id: string
            question_snapshot: Json
            sequence: number
            subject_code: string
          }
          Update: {
            attempt_id?: string
            question_id?: string
            question_snapshot?: Json
            sequence?: number
            subject_code?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_attempt_questions_attempt_id_fkey"
              columns: ["attempt_id"]
              isOneToOne: false
              referencedRelation: "exam_attempts"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "exam_attempt_questions_question_id_fkey"
              columns: ["question_id"]
              isOneToOne: false
              referencedRelation: "study_questions"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_attempts: {
          Row: {
            attempt_kind: string
            config_version: string
            created_at: string
            duration_minutes: number
            exam_program_id: string
            exam_year: number
            expires_at: string
            id: string
            idempotency_key: string | null
            score_summary: Json | null
            started_at: string
            status: string
            subject_code: string
            submitted_at: string | null
            updated_at: string
            user_id: string
          }
          Insert: {
            attempt_kind?: string
            config_version: string
            created_at?: string
            duration_minutes: number
            exam_program_id: string
            exam_year: number
            expires_at: string
            id?: string
            idempotency_key?: string | null
            score_summary?: Json | null
            started_at?: string
            status?: string
            subject_code: string
            submitted_at?: string | null
            updated_at?: string
            user_id: string
          }
          Update: {
            attempt_kind?: string
            config_version?: string
            created_at?: string
            duration_minutes?: number
            exam_program_id?: string
            exam_year?: number
            expires_at?: string
            id?: string
            idempotency_key?: string | null
            score_summary?: Json | null
            started_at?: string
            status?: string
            subject_code?: string
            submitted_at?: string | null
            updated_at?: string
            user_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_attempts_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_configurations: {
          Row: {
            config_version: string
            created_at: string
            exam_program_id: string
            exam_year: number
            full_mock_enabled: boolean
            id: string
            official_format_verified: boolean
            published_at: string | null
            settings: Json
            source_document: string | null
            source_sha256: string | null
            source_url: string | null
            status: string
            updated_at: string
            verified_at: string | null
            verified_by: string | null
          }
          Insert: {
            config_version: string
            created_at?: string
            exam_program_id: string
            exam_year: number
            full_mock_enabled?: boolean
            id?: string
            official_format_verified?: boolean
            published_at?: string | null
            settings?: Json
            source_document?: string | null
            source_sha256?: string | null
            source_url?: string | null
            status?: string
            updated_at?: string
            verified_at?: string | null
            verified_by?: string | null
          }
          Update: {
            config_version?: string
            created_at?: string
            exam_program_id?: string
            exam_year?: number
            full_mock_enabled?: boolean
            id?: string
            official_format_verified?: boolean
            published_at?: string | null
            settings?: Json
            source_document?: string | null
            source_sha256?: string | null
            source_url?: string | null
            status?: string
            updated_at?: string
            verified_at?: string | null
            verified_by?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "exam_configurations_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_program_subjects: {
          Row: {
            created_at: string
            display_name: string
            exam_program_id: string
            id: string
            is_available: boolean
            is_compulsory: boolean
            metadata: Json
            sort_order: number
            subject_code: string
          }
          Insert: {
            created_at?: string
            display_name: string
            exam_program_id: string
            id?: string
            is_available?: boolean
            is_compulsory?: boolean
            metadata?: Json
            sort_order?: number
            subject_code: string
          }
          Update: {
            created_at?: string
            display_name?: string
            exam_program_id?: string
            id?: string
            is_available?: boolean
            is_compulsory?: boolean
            metadata?: Json
            sort_order?: number
            subject_code?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_program_subjects_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_programs: {
          Row: {
            config_version: string
            created_at: string
            current_exam_year: number | null
            description: string | null
            display_name: string
            id: string
            is_active: boolean
            slug: string
            updated_at: string
          }
          Insert: {
            config_version?: string
            created_at?: string
            current_exam_year?: number | null
            description?: string | null
            display_name: string
            id: string
            is_active?: boolean
            slug: string
            updated_at?: string
          }
          Update: {
            config_version?: string
            created_at?: string
            current_exam_year?: number | null
            description?: string | null
            display_name?: string
            id?: string
            is_active?: boolean
            slug?: string
            updated_at?: string
          }
          Relationships: []
        }
        exam_syllabus_topics: {
          Row: {
            description: string | null
            id: string
            objectives: Json
            parent_topic_id: string | null
            sort_order: number
            source_ref: string | null
            status: string
            subject_code: string
            syllabus_version_id: string
            title: string
            topic_code: string
          }
          Insert: {
            description?: string | null
            id?: string
            objectives?: Json
            parent_topic_id?: string | null
            sort_order?: number
            source_ref?: string | null
            status?: string
            subject_code: string
            syllabus_version_id: string
            title: string
            topic_code: string
          }
          Update: {
            description?: string | null
            id?: string
            objectives?: Json
            parent_topic_id?: string | null
            sort_order?: number
            source_ref?: string | null
            status?: string
            subject_code?: string
            syllabus_version_id?: string
            title?: string
            topic_code?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_syllabus_topics_parent_topic_id_fkey"
              columns: ["parent_topic_id"]
              isOneToOne: false
              referencedRelation: "exam_syllabus_topics"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "exam_syllabus_topics_syllabus_version_id_fkey"
              columns: ["syllabus_version_id"]
              isOneToOne: false
              referencedRelation: "exam_syllabus_versions"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_syllabus_versions: {
          Row: {
            created_at: string
            exam_program_id: string
            exam_year: number
            id: string
            published_at: string | null
            source_document_path: string | null
            source_sha256: string | null
            source_title: string | null
            source_url: string | null
            status: string
            verified_at: string | null
            verified_by: string | null
            version: string
          }
          Insert: {
            created_at?: string
            exam_program_id: string
            exam_year: number
            id?: string
            published_at?: string | null
            source_document_path?: string | null
            source_sha256?: string | null
            source_title?: string | null
            source_url?: string | null
            status?: string
            verified_at?: string | null
            verified_by?: string | null
            version: string
          }
          Update: {
            created_at?: string
            exam_program_id?: string
            exam_year?: number
            id?: string
            published_at?: string | null
            source_document_path?: string | null
            source_sha256?: string | null
            source_title?: string | null
            source_url?: string | null
            status?: string
            verified_at?: string | null
            verified_by?: string | null
            version?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_syllabus_versions_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_user_bookmarks: {
          Row: {
            created_at: string
            exam_program_id: string
            question_id: string
            user_id: string
          }
          Insert: {
            created_at?: string
            exam_program_id: string
            question_id: string
            user_id: string
          }
          Update: {
            created_at?: string
            exam_program_id?: string
            question_id?: string
            user_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "exam_user_bookmarks_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "exam_user_bookmarks_question_id_fkey"
              columns: ["question_id"]
              isOneToOne: false
              referencedRelation: "study_questions"
              referencedColumns: ["id"]
            },
          ]
        }
        exam_user_progress: {
          Row: {
            exam_program_id: string
            last_answered_at: string | null
            last_selected_option: string | null
            last_viewed_at: string
            question_id: string
            user_id: string
            viewed_count: number
          }
          Insert: {
            exam_program_id: string
            last_answered_at?: string | null
            last_selected_option?: string | null
            last_viewed_at?: string
            question_id: string
            user_id: string
            viewed_count?: number
          }
          Update: {
            exam_program_id?: string
            last_answered_at?: string | null
            last_selected_option?: string | null
            last_viewed_at?: string
            question_id?: string
            user_id?: string
            viewed_count?: number
          }
          Relationships: [
            {
              foreignKeyName: "exam_user_progress_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "exam_user_progress_question_id_fkey"
              columns: ["question_id"]
              isOneToOne: false
              referencedRelation: "study_questions"
              referencedColumns: ["id"]
            },
          ]
        }
        jamb_question_admin_audit: {
          Row: {
            actor_id: string | null
            after_payload: Json | null
            before_payload: Json | null
            created_at: string
            id: string
            operation: string
            payload_sha256: string | null
            question_id: string | null
            rights_confirmed: boolean
            rights_note: string
            source_document: string | null
            source_reference: string | null
          }
          Insert: {
            actor_id?: string | null
            after_payload?: Json | null
            before_payload?: Json | null
            created_at?: string
            id?: string
            operation: string
            payload_sha256?: string | null
            question_id?: string | null
            rights_confirmed: boolean
            rights_note: string
            source_document?: string | null
            source_reference?: string | null
          }
          Update: {
            actor_id?: string | null
            after_payload?: Json | null
            before_payload?: Json | null
            created_at?: string
            id?: string
            operation?: string
            payload_sha256?: string | null
            question_id?: string | null
            rights_confirmed?: boolean
            rights_note?: string
            source_document?: string | null
            source_reference?: string | null
          }
          Relationships: []
        }
        question_import_batches: {
          Row: {
            approved_at: string | null
            approved_by: string | null
            approved_count: number
            created_at: string
            exam_program_id: string
            expected_items: number
            id: string
            imported_by: string
            needs_review_count: number
            published_at: string | null
            published_count: number
            rights_confirmed: boolean
            rights_note: string | null
            source_document: string
            source_sha256: string
            source_storage_path: string | null
            status: string
            subject_code: string
            total_items: number
            updated_at: string
          }
          Insert: {
            approved_at?: string | null
            approved_by?: string | null
            approved_count?: number
            created_at?: string
            exam_program_id: string
            expected_items?: number
            id?: string
            imported_by: string
            needs_review_count?: number
            published_at?: string | null
            published_count?: number
            rights_confirmed?: boolean
            rights_note?: string | null
            source_document: string
            source_sha256: string
            source_storage_path?: string | null
            status?: string
            subject_code: string
            total_items?: number
            updated_at?: string
          }
          Update: {
            approved_at?: string | null
            approved_by?: string | null
            approved_count?: number
            created_at?: string
            exam_program_id?: string
            expected_items?: number
            id?: string
            imported_by?: string
            needs_review_count?: number
            published_at?: string | null
            published_count?: number
            rights_confirmed?: boolean
            rights_note?: string | null
            source_document?: string
            source_sha256?: string
            source_storage_path?: string | null
            status?: string
            subject_code?: string
            total_items?: number
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "question_import_batches_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
          ]
        }
        question_import_items: {
          Row: {
            batch_id: string
            created_at: string
            duplicate_of: string | null
            id: string
            item_number: number
            normalized_payload: Json
            published_question_id: string | null
            raw_payload: Json
            reviewed_at: string | null
            reviewed_by: string | null
            status: string
            updated_at: string
            validation_errors: Json
          }
          Insert: {
            batch_id: string
            created_at?: string
            duplicate_of?: string | null
            id?: string
            item_number: number
            normalized_payload: Json
            published_question_id?: string | null
            raw_payload: Json
            reviewed_at?: string | null
            reviewed_by?: string | null
            status?: string
            updated_at?: string
            validation_errors?: Json
          }
          Update: {
            batch_id?: string
            created_at?: string
            duplicate_of?: string | null
            id?: string
            item_number?: number
            normalized_payload?: Json
            published_question_id?: string | null
            raw_payload?: Json
            reviewed_at?: string | null
            reviewed_by?: string | null
            status?: string
            updated_at?: string
            validation_errors?: Json
          }
          Relationships: [
            {
              foreignKeyName: "question_import_items_batch_id_fkey"
              columns: ["batch_id"]
              isOneToOne: false
              referencedRelation: "question_import_batches"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "question_import_items_duplicate_of_fkey"
              columns: ["duplicate_of"]
              isOneToOne: false
              referencedRelation: "question_import_items"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "question_import_items_published_question_id_fkey"
              columns: ["published_question_id"]
              isOneToOne: false
              referencedRelation: "study_questions"
              referencedColumns: ["id"]
            },
          ]
        }
        study_question_answer_keys: {
          Row: {
            correct_answer: string
            created_at: string
            explanation: string | null
            question_id: string
            review_status: string
            reviewed_at: string | null
            reviewed_by: string | null
            source_ref: string | null
            updated_at: string
          }
          Insert: {
            correct_answer: string
            created_at?: string
            explanation?: string | null
            question_id: string
            review_status?: string
            reviewed_at?: string | null
            reviewed_by?: string | null
            source_ref?: string | null
            updated_at?: string
          }
          Update: {
            correct_answer?: string
            created_at?: string
            explanation?: string | null
            question_id?: string
            review_status?: string
            reviewed_at?: string | null
            reviewed_by?: string | null
            source_ref?: string | null
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "study_question_answer_keys_question_id_fkey"
              columns: ["question_id"]
              isOneToOne: true
              referencedRelation: "study_questions"
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
            exam_seat_number: string | null
            id: string
            is_activated: boolean
            is_admin: boolean
            last_seen_at: string | null
            mfa_enrolled: boolean
            mfa_enrolled_at: string | null
            onboarding_completed_at: string | null
            onboarding_data: Json
            privacy_activity_status: string
            privacy_avatar: string
            privacy_groups: string
            privacy_last_seen: string
            privacy_online_status: string
            privacy_profile: string
            privacy_read_receipts: string
            public_key: string | null
            school_name: string | null
            subscription_duration_days: number | null
            subscription_expires_at: string | null
            subscription_started_at: string | null
            theme_preference: string | null
            trial_expires_at: string | null
            trial_started_at: string | null
            updated_at: string
            user_id: string
          }
          Insert: {
            achievements?: Json
            avatar_url?: string | null
            bio?: string | null
            created_at?: string
            display_name?: string | null
            exam_seat_number?: string | null
            id?: string
            is_activated?: boolean
            is_admin?: boolean
            last_seen_at?: string | null
            mfa_enrolled?: boolean
            mfa_enrolled_at?: string | null
            onboarding_completed_at?: string | null
            onboarding_data?: Json
            privacy_activity_status?: string
            privacy_avatar?: string
            privacy_groups?: string
            privacy_last_seen?: string
            privacy_online_status?: string
            privacy_profile?: string
            privacy_read_receipts?: string
            public_key?: string | null
            school_name?: string | null
            subscription_duration_days?: number | null
            subscription_expires_at?: string | null
            subscription_started_at?: string | null
            theme_preference?: string | null
            trial_expires_at?: string | null
            trial_started_at?: string | null
            updated_at?: string
            user_id: string
          }
          Update: {
            achievements?: Json
            avatar_url?: string | null
            bio?: string | null
            created_at?: string
            display_name?: string | null
            exam_seat_number?: string | null
            id?: string
            is_activated?: boolean
            is_admin?: boolean
            last_seen_at?: string | null
            mfa_enrolled?: boolean
            mfa_enrolled_at?: string | null
            onboarding_completed_at?: string | null
            onboarding_data?: Json
            privacy_activity_status?: string
            privacy_avatar?: string
            privacy_groups?: string
            privacy_last_seen?: string
            privacy_online_status?: string
            privacy_profile?: string
            privacy_read_receipts?: string
            public_key?: string | null
            school_name?: string | null
            subscription_duration_days?: number | null
            subscription_expires_at?: string | null
            subscription_started_at?: string | null
            theme_preference?: string | null
            trial_expires_at?: string | null
            trial_started_at?: string | null
            updated_at?: string
            user_id?: string
          }
          Relationships: []
        }
        study_questions: {
          Row: {
            category: string
            content_hash: string | null
            correct_answer: string | null
            course: string | null
            created_at: string | null
            difficulty: string | null
            exam_program_id: string
            explanation: string | null
            hidden: boolean
            id: string
            image_position: string | null
            image_url: string | null
            image_urls: Json
            options: Json | null
            question: string | null
            review_status: string
            reviewed_at: string | null
            reviewed_by: string | null
            search_document: unknown
            search_document_program: unknown
            sort_order: number | null
            source_batch_id: string | null
            source_document: string | null
            source_page: number | null
            source_question_number: string | null
            source_ref: string | null
            subject: string
            updated_at: string
            year: number
          }
          Insert: {
            category: string
            content_hash?: string | null
            correct_answer?: string | null
            course?: string | null
            created_at?: string | null
            difficulty?: string | null
            exam_program_id?: string
            explanation?: string | null
            hidden?: boolean
            id: string
            image_position?: string | null
            image_url?: string | null
            image_urls?: Json
            options?: Json | null
            question?: string | null
            review_status?: string
            reviewed_at?: string | null
            reviewed_by?: string | null
            search_document?: unknown
            search_document_program?: unknown
            sort_order?: number | null
            source_batch_id?: string | null
            source_document?: string | null
            source_page?: number | null
            source_question_number?: string | null
            source_ref?: string | null
            subject: string
            updated_at?: string
            year: number
          }
          Update: {
            category?: string
            content_hash?: string | null
            correct_answer?: string | null
            course?: string | null
            created_at?: string | null
            difficulty?: string | null
            exam_program_id?: string
            explanation?: string | null
            hidden?: boolean
            id?: string
            image_position?: string | null
            image_url?: string | null
            image_urls?: Json
            options?: Json | null
            question?: string | null
            review_status?: string
            reviewed_at?: string | null
            reviewed_by?: string | null
            search_document?: unknown
            search_document_program?: unknown
            sort_order?: number | null
            source_batch_id?: string | null
            source_document?: string | null
            source_page?: number | null
            source_question_number?: string | null
            source_ref?: string | null
            subject?: string
            updated_at?: string
            year?: number
          }
          Relationships: [
            {
              foreignKeyName: "study_questions_exam_program_id_fkey"
              columns: ["exam_program_id"]
              isOneToOne: false
              referencedRelation: "exam_programs"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "study_questions_source_batch_id_fkey"
              columns: ["source_batch_id"]
              isOneToOne: false
              referencedRelation: "question_import_batches"
              referencedColumns: ["id"]
            },
          ]
        }
    };
    Views: { [_ in never]: never };
    Functions: {
        publish_jamb_question_batch: {
          Args: { p_actor: string; p_batch_id: string }
          Returns: Json
        }
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
