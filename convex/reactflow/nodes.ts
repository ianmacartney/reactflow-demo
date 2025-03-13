import { v } from "convex/values";
import { addEdge, applyNodeChanges } from "reactflow";
import { mutation, query } from "../_generated/server";
import { customData } from "../schema";
import { nodeChangeValidator, nodeValidator } from "./types";
import { clientData } from "../shared";
import { canReadDiagramData, canWriteDiagramData } from "./access";

export const get = query({
  args: { diagramId: v.string() },
  handler: async (ctx, args) => {
    if (!canReadDiagramData(ctx, args.diagramId)) {
      throw new Error("Unauthorized");
    }
    const all = await ctx.db
      .query("nodes")
      .withIndex("diagram", (q) => q.eq("diagramId", args.diagramId))
      .collect();
    // Modify data returned, join it, etc. here
    const nodesWithCounts = await Promise.all(
      all.map(async (node) => {
        const count =
          node.node.data.counterId &&
          (await ctx.db.get(node.node.data.counterId));
        return {
          ...node.node,
          data: {
            count: count?.count ?? 0,
          },
        };
      }),
    );
    return nodesWithCounts;
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
    data: clientData,
    sourceNode: v.optional(
      v.object({
        id: v.string(),
        handlepos: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (!canWriteDiagramData(ctx, args.diagramId)) {
      throw new Error("Unauthorized");
    }

    // Create a new node with the simplified structure, denormalized data
    const counterId = await ctx.db.insert("counters", {
      count: args.data.count,
    });
    const node = {
      id: args.nodeId,
      position: args.position,
      data: { counterId },
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
    changes: v.array(nodeChangeValidator(clientData)),
  },
  handler: async (ctx, args) => {
    if (!canWriteDiagramData(ctx, args.diagramId)) {
      throw new Error("Unauthorized");
    }

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
    const updatedIds = new Set(updatedNodes.map((n) => n.id));

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
    // Handle deletions
    await Promise.all(
      nodes.map(async (node) => {
        if (!updatedIds.has(node.node.id)) {
          await ctx.db.delete(node._id);
        }
      }),
    );
  },
});

// If you want to subscribe to the data for just one node:
export const getData = query({
  args: {
    diagramId: v.string(),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!canReadDiagramData(ctx, args.diagramId)) {
      throw new Error("Unauthorized");
    }

    const node = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("node.id", args.nodeId))
      .unique();
    if (!node) {
      throw new Error(`Node ${args.nodeId} not found`);
    }
    const counterId = node.node.data.counterId;
    const counter = counterId && (await ctx.db.get(counterId));
    return {
      count: counter?.count ?? 0,
    };
  },
});

export const updateData = mutation({
  args: {
    diagramId: v.string(),
    nodeId: v.string(),
    data: clientData,
  },
  handler: async (ctx, args) => {
    if (!canWriteDiagramData(ctx, args.diagramId)) {
      throw new Error("Unauthorized");
    }

    // Find the node to update
    const node = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("node.id", args.nodeId))
      .unique();

    if (!node) {
      throw new Error(`Node ${args.nodeId} not found`);
    }
    let counterId = node.node.data.counterId;
    const counter = counterId && (await ctx.db.get(counterId));
    if (!counter) {
      counterId = await ctx.db.insert("counters", {
        count: args.data.count,
      });
    } else {
      await ctx.db.patch(counter._id, {
        count: args.data.count,
      });
    }

    // Alternatively, if we wanted to update the node data:
    // await ctx.db.patch(node._id, {
    //   node: {
    //     ...node.node,
    //     data: {...},
    //   },
    // });

    return true;
  },
});
