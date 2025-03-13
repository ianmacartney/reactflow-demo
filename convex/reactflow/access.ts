import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx } from "../_generated/server";

export function canReadDiagramData(ctx: QueryCtx, diagramId: string) {
  const userId = getAuthUserId(ctx);
  // TODO: Do real access checks here
  return true;
}

export function canWriteDiagramData(ctx: QueryCtx, diagramId: string) {
  const userId = getAuthUserId(ctx);
  // TODO: Do real access checks here
  return true;
}
