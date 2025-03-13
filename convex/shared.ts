import { Infer, v } from "convex/values";

export type ClientData = Infer<typeof clientData>;
export const clientData = v.object({
  count: v.number(),
});
