import { useMutation } from "convex/react";
import { Handle, NodeProps, Position } from "reactflow";
import { api } from "../../convex/_generated/api";
import { ClientData } from "../../convex/shared";

export default function CounterNode({ id, data }: NodeProps<ClientData>) {
  const updateData = useMutation(api.reactflow.nodes.updateData);
  const diagramId = window.location.hash.slice(1);

  const incrementCounter = () => {
    // Use the new updateData mutation
    updateData({
      diagramId,
      nodeId: id,
      data: { count: data.count + 1 },
    });
  };

  return (
    <>
      <div className="bg-white ">
        <Handle type="target" position={Position.Top} />
        <p className="text-lg font-semibold mb-2">Count: {data.count}</p>
        <button
          className="nodrag bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          onClick={incrementCounter}
        >
          Increment
        </button>
        <Handle type="source" position={Position.Bottom} />
      </div>
    </>
  );
}
