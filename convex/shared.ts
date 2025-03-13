import { Infer, v } from "convex/values";

export type ClientData = Infer<typeof clientData>;
export const clientData = v.object({
  count: v.optional(v.number()),
  count2: v.optional(v.number()),
  foo: v.string(),
});
