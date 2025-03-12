import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { edgeValidator, nodeValidator } from "./reactflow/types";

export const nodeData = v.object({
  foo: v.number(),
});

export const rfNode = nodeValidator(nodeData);

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
  nodes: defineTable({
    diagramId: v.string(),
    node: rfNode,
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
