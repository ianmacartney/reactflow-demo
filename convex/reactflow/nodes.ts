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
import { nodeChangeValidator, nodeValidator } from "./types";
import { rfNode } from "../schema";
import { applyNodeChanges } from "reactflow";

export const get = query({
  args: { diagramId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("nodes")
      .withIndex("diagram", (q) => q.eq("diagramId", args.diagramId))
      .collect();
    return all.map((node) => node.node);
  },
});

export const update = mutation({
  args: {
    diagramId: v.string(),
    changes: v.array(nodeChangeValidator(rfNode)),
  },
  handler: async (ctx, args) => {
    // Get the ids of the nodes that are being changed
    const ids = args.changes.flatMap((change) =>
      change.type === "add" || change.type === "reset"
        ? [change.item.id]
        : [change.id],
    );
    // Only fetch the nodes that are being changed
    const nodes = (
      await Promise.all(
        ids.map(async (id) =>
          ctx.db
            .query("nodes")
            .withIndex("id", (q) => q.eq("node.id", id))
            .unique(),
        ),
      )
    ).flatMap((n) => (n ? [n] : []));
    const nodesById = new Map(nodes.map((n) => [n.node.id, n]));

    const updatedNodes = applyNodeChanges(
      args.changes,
      nodes.map((node) => node.node),
    );

    await Promise.all(
      updatedNodes.map(async (node) => {
        const existing = nodesById.get(node.id);
        if (existing) {
          await ctx.db.patch(existing._id, { node });
        } else {
          await ctx.db.insert("nodes", {
            diagramId: args.diagramId,
            node,
          });
        }
      }),
    );
  },
});
