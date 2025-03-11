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
import {
  connectionValidator,
  edgeChangeValidator,
  edgeValidator,
} from "./types";
import { rfEdge } from "../schema";
import { addEdge, applyEdgeChanges } from "reactflow";

export const get = query({
  args: { diagramId: v.string() },
  handler: async (ctx, args) => {
    // Do access checks here
    const all = await ctx.db
      .query("edges")
      .withIndex("diagram", (q) => q.eq("diagramId", args.diagramId))
      .collect();
    // Modify data returned, join it, etc. here
    return all.map((edge) => edge.edge);
  },
});

export const update = mutation({
  args: {
    diagramId: v.string(),
    changes: v.array(edgeChangeValidator(rfEdge)),
  },
  handler: async (ctx, args) => {
    // Do access checks here
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

export const connect = mutation({
  args: {
    diagramId: v.string(),
    connection: connectionValidator,
  },
  handler: async (ctx, args) => {
    // Do access checks here
    const { source, target, sourceHandle, targetHandle } = args.connection;
    if (!source || !target) {
      throw new Error("Source or target not specified");
    }
    const sourceDoc = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("node.id", source))
      .unique();
    const targetDoc = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("node.id", target))
      .unique();
    if (!sourceDoc || !targetDoc) {
      throw new Error("Source or target not found");
    }
    const existing = await ctx.db
      .query("edges")
      .withIndex("source", (q) =>
        q.eq("source", sourceDoc._id).eq("target", targetDoc._id),
      )
      .collect();
    if (
      existing.find(
        (e) =>
          e.edge.source === source &&
          e.edge.target === target &&
          e.edge.sourceHandle === sourceHandle &&
          e.edge.targetHandle === targetHandle,
      )
    ) {
      return;
    }
    const sourceNode = await ctx.db
      .query("nodes")
      .withIndex("id", (q) => q.eq("node.id", source))
      .unique();
    if (!sourceNode) {
      console.log("sourceNode doesn't exist", args.connection);
      return;
    }
    const targetNode =
      target &&
      (await ctx.db
        .query("nodes")
        .withIndex("id", (q) => q.eq("node.id", target))
        .unique());
    if (!targetNode) {
      console.log("targetNode doesn't exist", args.connection);
      return;
    }
    const edges = addEdge(args.connection, []);
    await Promise.all(
      edges.map(async (edge) => {
        await ctx.db.insert("edges", {
          diagramId: args.diagramId,
          edge,
          source: sourceDoc._id,
          target: targetDoc._id,
        });
      }),
    );
  },
});
