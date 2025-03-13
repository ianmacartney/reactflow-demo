import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { edgeValidator, nodeValidator } from "./reactflow/types";

export const customData = v.object({
  counterId: v.optional(v.id("counters")),
  // foo: v.string(),
});

export const edgeData = v.object({
  bar: v.number(),
});

export const rfEdge = edgeValidator(edgeData);

export default defineSchema({
  ...authTables,
  diagrams: defineTable({
    // There's an _id automatically, but allow custom string
    // for client-side generation.
    id: v.string(),
    // The name of the diagram.
    name: v.string(),
    // Note: there's already a "by_id" index, so we can't use that name.
  }).index("id", ["id"]),
  // Example table if you want to store data outside of the node
  counters: defineTable({
    count: v.number(),
  }),
  nodes: defineTable({
    diagramId: v.string(),
    node: nodeValidator(customData),
  })
    .index("diagram", ["diagramId"])
    .index("id", ["node.id"]),

  edges: defineTable({
    source: v.id("nodes"),
    target: v.id("nodes"),
    diagramId: v.string(),
    edge: rfEdge,
  })
    .index("diagram", ["diagramId"])
    .index("id", ["edge.id"])
    .index("source", ["source", "target"])
    .index("target", ["target", "source"]),
});
