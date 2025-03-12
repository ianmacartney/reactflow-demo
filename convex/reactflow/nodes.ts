import { v } from "convex/values";
import { applyNodeChanges } from "reactflow";
import {
  mutation,
  query
} from "../_generated/server";
import { nodeDataValidator, rfNode } from "../schema";
import { nodeChangeValidator } from "./types";

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

export const create = mutation({
  args: {
    diagramId: v.string(),
    nodeId: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    data: nodeDataValidator,
  },
  handler: async (ctx, args) => {
    // Create a new node with the simplified structure
    const node = {
      id: args.nodeId,
      position: args.position,
      data: args.data,
      type: 'default'
    };

    // Insert directly into the database
    await ctx.db.insert("nodes", {
      diagramId: args.diagramId,
      node,
    });

    return node;
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

export const updateNodeData = mutation({
  args: {
    diagramId: v.string(),
    nodeId: v.string(),
    data: nodeDataValidator,
  },
  handler: async (ctx, args) => {
    // Find the node to update
    const node = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("node.id", args.nodeId))
      .unique();
    
    if (!node) {
      throw new Error(`Node ${args.nodeId} not found`);
    }
    
    // Update just the data field
    await ctx.db.patch(node._id, { 
      node: {
        ...node.node,
        data: args.data
      }
    });
    
    return true;
  },
});
