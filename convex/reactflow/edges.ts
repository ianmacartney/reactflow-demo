import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { edgeChangeValidator, edgeValidator } from "./types";
import { rfEdge } from "../schema";
import { applyEdgeChanges } from "reactflow";

export const get = query({
  args: { diagramId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("edges")
      .withIndex("diagram", (q) => q.eq("diagramId", args.diagramId))
      .collect();
    return all.map((edge) => edge.edge);
  },
});

export const update = mutation({
  args: {
    diagramId: v.string(),
    changes: v.array(edgeChangeValidator(rfEdge)),
  },
  handler: async (ctx, args) => {
    // Get the ids of the edges that are being changed
    const ids = args.changes.flatMap((change) =>
      change.type === "add" || change.type === "reset"
        ? [change.item.id]
        : [change.id],
    );
    // Only fetch the edges that are being changed
    const edges = (
      await Promise.all(
        ids.map(async (id) =>
          ctx.db
            .query("edges")
            .withIndex("id", (q) => q.eq("edge.id", id))
            .unique(),
        ),
      )
    ).flatMap((n) => (n ? [n] : []));
    const edgesById = new Map(edges.map((n) => [n.edge.id, n]));

    const updatedEdges = applyEdgeChanges(
      args.changes,
      edges.map((edge) => edge.edge),
    );

    await Promise.all(
      updatedEdges.map(async (edge) => {
        const existing = edgesById.get(edge.id);
        const source = (
          await ctx.db
            .query("nodes")
            .withIndex("id", (q) => q.eq("node.id", edge.source))
            .unique()
        )?._id;
        const target = (
          await ctx.db
            .query("nodes")
            .withIndex("id", (q) => q.eq("node.id", edge.target))
            .unique()
        )?._id;
        if (!source || !target) {
          throw new Error("Source or target node not found");
        }
        if (edge.label)
          if (existing) {
            await ctx.db.patch(existing._id, { edge, source, target });
          } else {
            await ctx.db.insert("edges", {
              diagramId: args.diagramId,
              edge,
              source,
              target,
            });
          }
      }),
    );
  },
});
