export function getPostAuthRedirectPath(role: string): string {
  if (role === "INSTITUTION") return "/institution";
  if (role === "PME_OWNER" || role === "PME_MEMBER") return "/dashboard";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  return "/investor";
}
