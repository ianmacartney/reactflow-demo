import {
  Infer,
  v,
  Validator,
  Value,
  VArray,
  VFloat64,
  VString,
  VUnion,
} from "convex/values";
import {
  Edge,
  EdgeChange,
  MarkerType,
  Node,
  NodeChange,
  Position,
} from "reactflow";

const positions = v.union(
  v.literal("left"),
  v.literal("right"),
  v.literal("top"),
  v.literal("bottom"),
);
const numberOrNull = v.union(v.number(), v.null());
const position = positions as VUnion<Position, typeof positions.members>;
const xyPosition = v.object({
  x: v.number(),
  y: v.number(),
});
// const xyzPosition = v.object({
//   x: v.number(),
//   y: v.number(),
//   z: v.number(),
// });
const dimensions = v.object({
  width: v.number(),
  height: v.number(),
});

// const rect = v.object({
//   x: v.number(),
//   y: v.number(),
//   width: v.number(),
//   height: v.number(),
// });

// const box = v.object({
//   x: v.number(),
//   y: v.number(),
//   x2: v.number(),
//   y2: v.number(),
// });

const duple = v.array(v.number()) as VArray<[number, number], VFloat64>;
// const truple = v.array(v.number()) as VArray<
//   [number, number, number],
//   VFloat64
// >;
const twoByTwo = v.array(v.array(v.number())) as VArray<
  [[number, number], [number, number]],
  typeof duple
>;

// 3 elements: scale, translateX, translateY
// const transform = truple;

// 2x2 array of numbers
const coordinateExtent = twoByTwo;

const handleElement = v.object({
  x: v.number(),
  y: v.number(),
});

const nodeHandleBounds = v.object({
  source: v.union(v.array(handleElement), v.null()),
  target: v.union(v.array(handleElement), v.null()),
});

export const nodeValidator = <T extends Validator<Value, "required", any>>(
  data: T,
) =>
  v.object({
    id: v.string(),
    position: xyPosition,
    data: data,
    type: v.optional(v.string()),
    className: v.optional(v.string()),
    sourcePosition: v.optional(position),
    targetPosition: v.optional(position),
    hidden: v.optional(v.boolean()),
    selected: v.optional(v.boolean()),
    dragging: v.optional(v.boolean()),
    draggable: v.optional(v.boolean()),
    selectable: v.optional(v.boolean()),
    connectable: v.optional(v.boolean()),
    deletable: v.optional(v.boolean()),
    dragHandle: v.optional(v.string()),
    width: v.optional(numberOrNull),
    height: v.optional(numberOrNull),
    parentId: v.optional(v.string()),
    zIndex: v.optional(v.number()),
    extent: v.optional(v.union(v.literal("parent"), coordinateExtent)),
    expandParent: v.optional(v.boolean()),
    positionAbsolute: v.optional(xyPosition),
    ariaLabel: v.optional(v.string()),
    focusable: v.optional(v.boolean()),
    resizing: v.optional(v.boolean()),
    internals: v.optional(
      v.object({
        z: v.optional(v.number()),
        handleBounds: v.optional(nodeHandleBounds),
      }),
    ),
  });

// This is just a type check to make sure the types match ReactFlow's Node type
// ignore unused variable
const _node: Node = {} as Infer<
  ReturnType<typeof nodeValidator<VString<string, "required">>>
>;

// Utility validators for edge properties
const edgeLabelOptions = v.object({
  // We just aren't going to store support react nodes for now
  // label: v.optional(v.union(v.number(), v.string(), v.boolean(), v.null())),
  labelStyle: v.optional(v.any()), // CSSProperties
  labelShowBg: v.optional(v.boolean()),
  labelBgStyle: v.optional(v.any()), // CSSProperties
  labelBgPadding: v.optional(duple),
  labelBgBorderRadius: v.optional(v.number()),
});

const handleType = v.union(v.literal("source"), v.literal("target"));

const markerTypeInner = v.union(v.literal("arrow"), v.literal("arrowclosed"));
const markerType = markerTypeInner as VUnion<
  MarkerType,
  typeof markerTypeInner.members
>;

const edgeMarker = v.union(
  v.string(),
  v.object({
    type: markerType,
    color: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    markerUnits: v.optional(v.string()),
    orient: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
  }),
);

export const defaultEdgeValidator = <
  T extends Validator<Value, "required", any>,
>(
  data: T,
) =>
  v.object({
    id: v.string(),
    type: v.optional(v.string()),
    source: v.string(),
    target: v.string(),
    sourceHandle: v.optional(v.union(v.string(), v.null())),
    targetHandle: v.optional(v.union(v.string(), v.null())),
    style: v.optional(v.any()), // CSSProperties
    animated: v.optional(v.boolean()),
    hidden: v.optional(v.boolean()),
    deletable: v.optional(v.boolean()),
    data: v.optional(data),
    className: v.optional(v.string()),
    selected: v.optional(v.boolean()),
    markerStart: v.optional(edgeMarker),
    markerEnd: v.optional(edgeMarker),
    zIndex: v.optional(v.number()),
    ariaLabel: v.optional(v.string()),
    interactionWidth: v.optional(v.number()),
    focusable: v.optional(v.boolean()),
    updatable: v.optional(v.union(v.boolean(), handleType)),
    reconnectable: v.optional(v.union(v.boolean(), handleType)),
    // Include edge label options
    ...edgeLabelOptions.fields,
    // Path options for different edge types
    pathOptions: v.optional(
      v.union(
        // SmoothStepPathOptions
        v.object({
          offset: v.optional(v.number()),
          borderRadius: v.optional(v.number()),
        }),
        // BezierPathOptions
        v.object({
          curvature: v.optional(v.number()),
        }),
      ),
    ),
  });

export const edgeValidator = <T extends Validator<Value, "required", any>>(
  data: T,
) =>
  v.union(
    v.object({
      ...defaultEdgeValidator(data).fields,
      type: v.literal("smoothstep"),
      pathOptions: v.object({
        offset: v.optional(v.number()),
        borderRadius: v.optional(v.number()),
      }),
    }),
    v.object({
      ...defaultEdgeValidator(data).fields,
      type: v.literal("default"),
      pathOptions: v.object({
        curvature: v.optional(v.number()),
      }),
    }),
    defaultEdgeValidator(data),
  );

// This is just a type check to make sure the types match ReactFlow's Node type
type OurEdge = Infer<
  ReturnType<typeof edgeValidator<VString<string, "required">>>
>;
// ignore unused variable
const _edge: Edge = {} as OurEdge;
const _edgeOtherWay: OurEdge = {} as Edge;

const nodeDimensionChange = v.object({
  id: v.string(),
  type: v.literal("dimensions"),
  dimensions: v.optional(dimensions),
  updateStyle: v.optional(v.boolean()),
  resizing: v.optional(v.boolean()),
});

const nodePositionChange = v.object({
  id: v.string(),
  type: v.literal("position"),
  position: v.optional(xyPosition),
  positionAbsolute: v.optional(xyPosition),
  dragging: v.optional(v.boolean()),
});

const nodeSelectionChange = v.object({
  id: v.string(),
  type: v.literal("select"),
  selected: v.boolean(),
});

const nodeRemoveChange = v.object({
  id: v.string(),
  type: v.literal("remove"),
});

const nodeAddChange = <T extends Validator<Value, "required", any>>(data: T) =>
  v.object({
    item: nodeValidator(data),
    type: v.literal("add"),
  });

const nodeResetChange = <T extends Validator<Value, "required", any>>(
  data: T,
) =>
  v.object({
    item: nodeValidator(data),
    type: v.literal("reset"),
  });

export const nodeChangeValidator = <
  T extends Validator<Value, "required", any>,
>(
  data: T,
) =>
  v.union(
    nodeDimensionChange,
    nodePositionChange,
    nodeSelectionChange,
    nodeRemoveChange,
    nodeAddChange(data),
    nodeResetChange(data),
  );
const _nodeChange: NodeChange = {} as Infer<
  ReturnType<typeof nodeChangeValidator<VString<string, "required">>>
>;

// export type NodeChangeExtended = NodeChange | NodeDataChange;

const edgeSelectionChange = nodeSelectionChange;

const edgeRemoveChange = nodeRemoveChange;

const edgeAddChange = <T extends Validator<Value, "required", any>>(data: T) =>
  v.object({
    item: edgeValidator(data),
    type: v.literal("add"),
  });

const edgeResetChange = <T extends Validator<Value, "required", any>>(
  data: T,
) =>
  v.object({
    item: edgeValidator(data),
    type: v.literal("reset"),
  });

export const edgeChangeValidator = <
  T extends Validator<Value, "required", any>,
>(
  data: T,
) =>
  v.union(
    edgeSelectionChange,
    edgeRemoveChange,
    edgeAddChange(data),
    edgeResetChange(data),
  );

const _edgeChange: EdgeChange = {} as Infer<
  ReturnType<typeof edgeChangeValidator<VString<string, "required">>>
>;

const stringOrNull = v.union(v.string(), v.null());
export const connectionValidator = v.object({
  source: stringOrNull,
  target: stringOrNull,
  sourceHandle: stringOrNull,
  targetHandle: stringOrNull,
});
