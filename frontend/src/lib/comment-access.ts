export const COMMENT_ACCESS_ROLES = [
  "Legacore User",
  "admin",
  "App admin",
];

export const COMMENTS_ACCESS_DENIED_MESSAGE =
  "Summary comments are only available to Legacore users and admins.";

export const hasCommentAccess = (roles?: string[] | null) =>
  (roles ?? []).some((role) => COMMENT_ACCESS_ROLES.includes(role));
