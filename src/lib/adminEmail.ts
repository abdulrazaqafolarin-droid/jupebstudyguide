const configuredAdminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();

// The only owner account allowed to bypass subscription and device restrictions.
// The backend independently checks this address together with the protected
// profiles.is_admin flag; this constant is for consistent UI behaviour only.
export const ADMIN_EMAIL = configuredAdminEmail || "abdulrazaqafolarin@gmail.com";
export const SUPER_ADMIN_EMAIL = ADMIN_EMAIL;
