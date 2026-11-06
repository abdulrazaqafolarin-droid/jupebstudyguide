/**
 * Deprecated compatibility shim.
 *
 * User data is namespaced by account in useUserStorage. Removing other users'
 * namespaces on sign-out or account changes destroys offline learning state
 * that may not yet have reached Supabase. Keep all namespaces and legacy keys;
 * access isolation is enforced by the active account's storage key instead.
 */
export function purgeForeignUserData(_currentUserId: string | null) {
  // Intentionally non-destructive.
}
