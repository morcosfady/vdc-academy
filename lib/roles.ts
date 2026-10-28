// Every role check lives here. Screens ask `can(profile, "permission")` or the is* helpers, never compare role
// strings themselves, so a new role or a super-admin-only power is a change in this one file.
//
// Roles (profiles.role, set by the database, never by the browser):
//   student      picked "Student" at sign-up
//   recruiter    picked "Recruiter" at sign-up; the company account is verified by an admin
//   admin        the academy team, promoted by a super admin
//   super_admin  the owner, granted server side from public.role_grants after the email is confirmed
// account_type (student | recruiter) is chosen once at sign-up and stays, even if an admin later promotes the user.

export type Role = "student" | "recruiter" | "admin" | "super_admin";
export type AccountType = "student" | "recruiter";

export type RoleHolder = { role?: Role | string | null; account_type?: AccountType | string | null } | null | undefined;

export const isSuperAdmin = (p: RoleHolder) => p?.role === "super_admin";
export const isAdmin = (p: RoleHolder) => p?.role === "admin" || p?.role === "super_admin";
export const isRecruiter = (p: RoleHolder) => !isAdmin(p) && (p?.role === "recruiter" || p?.account_type === "recruiter");
export const isStudent = (p: RoleHolder) => !isAdmin(p) && !isRecruiter(p) && (p?.role === "student" || p?.account_type === "student" || !p?.account_type);

export type Permission =
  // students
  | "apply"
  | "view_own_applications"
  | "view_own_evaluations"
  // recruiters
  | "send_hiring_request"
  | "view_own_hiring_requests"
  | "evaluate_students" // verified recruiters only, enforced in the database
  // academy team
  | "view_admin"
  | "review_applications"
  | "verify_discounts"
  | "manage_users"
  | "verify_recruiters"
  | "manage_hiring_requests"
  | "read_inbox"
  | "export_csv"
  | "moderate_evaluations"
  // super admin only (the owner named the first one: the calendar)
  | "manage_calendar"
  | "manage_admins"
  | "site_settings";

const ADMIN: Permission[] = ["view_admin", "review_applications", "verify_discounts", "manage_users", "verify_recruiters", "manage_hiring_requests", "read_inbox", "export_csv", "moderate_evaluations"];

// TODO(super admin): the owner will list what only the super admin may do. Move those permissions out of ADMIN
// and into SUPER_ONLY (for example manage_admins, site_settings), then gate the screens with can(). Until then
// the super admin has every admin permission and nothing else.
// First super-admin-only power: adding events to the public calendar (built later in the internal dashboard).
const SUPER_ONLY: Permission[] = ["manage_calendar"];

export const PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: ["apply", "view_own_applications", "view_own_evaluations"],
  recruiter: ["send_hiring_request", "view_own_hiring_requests", "evaluate_students"],
  admin: ADMIN,
  super_admin: [...ADMIN, ...SUPER_ONLY],
};

export function roleOf(p: RoleHolder): Role {
  if (isSuperAdmin(p)) return "super_admin";
  if (isAdmin(p)) return "admin";
  if (isRecruiter(p)) return "recruiter";
  return "student";
}

export const can = (p: RoleHolder, permission: Permission) => Boolean(p) && PERMISSIONS[roleOf(p)].includes(permission);

export const roleLabel: Record<Role, string> = { student: "Student", recruiter: "Recruiter", admin: "Admin", super_admin: "Super admin" };
