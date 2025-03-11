import { v } from "convex/values";
import { addEdge, applyNodeChanges } from "reactflow";
import { mutation, query } from "../_generated/server";
import { nodeData, rfNode } from "../schema";
import { nodeChangeValidator } from "./types";

export const get = query({
  args: { diagramId: v.string() },
  handler: async (ctx, args) => {
    // Do access checks here
    const all = await ctx.db
      .query("nodes")
      .withIndex("diagram", (q) => q.eq("diagramId", args.diagramId))
      .collect();
    // Modify data returned, join it, etc. here
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
    data: nodeData,
    sourceNode: v.optional(
      v.object({
        id: v.string(),
        handlepos: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Do access checks here
    // Create a new node with the simplified structure
    const node = {
      id: args.nodeId,
      position: args.position,
      data: args.data,
      type: "default",
    };

    // Generate related documents and store ids in the node here

    // Associate it with a user, etc. here
    // Insert directly into the database
    const nodeId = await ctx.db.insert("nodes", {
      diagramId: args.diagramId,
      node,
    });
    const sourceNode = args.sourceNode;
    if (sourceNode) {
      const sourceNodeDoc = await ctx.db
        .query("nodes")
        .withIndex("id", (q) => q.eq("node.id", sourceNode.id))
        .first();
      if (sourceNodeDoc) {
        const targetHandle =
          sourceNodeDoc.node.position.y > args.position.y ? "top" : "bottom";
        const edges = addEdge(
          {
            id: crypto.randomUUID(),
            source: sourceNode.id,
            target: args.nodeId,
            sourceHandle: sourceNode.handlepos,
            targetHandle,
          },
          [],
        );
        await Promise.all(
          edges.map((edge) =>
            ctx.db.insert("edges", {
              diagramId: args.diagramId,
              source: sourceNodeDoc._id,
              target: nodeId,
              edge,
            }),
          ),
        );
      }
    }

    return node;
  },
});

export const update = mutation({
  args: {
    diagramId: v.string(),
    changes: v.array(nodeChangeValidator(rfNode)),
  },
  handler: async (ctx, args) => {
    // Do access checks here
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
