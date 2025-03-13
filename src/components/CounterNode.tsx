import { useMutation } from "convex/react";
import { Handle, NodeProps, Position } from "reactflow";
import { api } from "../../convex/_generated/api";
import { ClientData } from "../../convex/shared";

export default function CounterNode({ id, data }: NodeProps<ClientData>) {
  const updateData = useMutation(api.reactflow.nodes.updateData).withOptimisticUpdate(
    (store, args) => {
      const nodes = store.getQuery(api.reactflow.nodes.get, { diagramId });
      if (!nodes) return;
      const updatedNodes = nodes?.map(node => {
        if (node.id === args.nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...args.data
            }
          };
        }
        return node;
      });
      store.setQuery(api.reactflow.nodes.get, { diagramId }, updatedNodes);
    }
  );

  const diagramId = window.location.hash.slice(1);

  const incrementTableCounter = () => {
    // Use the new updateData mutation
    updateData({
      diagramId,
      nodeId: id,
      data: { count: (data.count ?? 0) + 1 },
    });
  };

  const incrementNodeCounter = () => {
    // Use    the new updateData mutation
    updateData({
      diagramId,
      nodeId: id,
      data: { count2: (data.count2 ?? 0) + 1 },
    });
  };

  return (
    <>
      <div className="bg-white ">
        <Handle type="target" position={Position.Top} />
        <p className="text-lg font-semibold mb-2">Table Count: {data.count}</p>
        <p className="text-lg font-semibold mb-2">Node Count: {data.count2}</p>
        <button
          className="nodrag bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          onClick={incrementTableCounter}
        >
          Increment Table Count
        </button>
        <button
          className="nodrag bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          onClick={incrementNodeCounter}
        >
          Increment Node Count
        </button>
        <Handle type="source" position={Position.Bottom} />
      </div>
    </>
  );
}
