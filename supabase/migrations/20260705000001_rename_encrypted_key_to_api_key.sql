-- Rename encrypted_key column to api_key to match edge function code
ALTER TABLE public.ai_api_keys RENAME COLUMN encrypted_key TO api_key;
