// Une demande n'est modifiable/supprimable par la PME que tant qu'elle n'a
// jamais été rendue visible aux investisseurs. Doit rester alignée avec
// EDITABLE_FUNDING_STATUSES dans apps/backend/src/funding/funding-status.constants.ts.
export const EDITABLE_STATUSES = ["DRAFT", "UNDER_REVIEW"];

export function isFundingRequestEditable(status: string) {
  return EDITABLE_STATUSES.includes(status);
}
