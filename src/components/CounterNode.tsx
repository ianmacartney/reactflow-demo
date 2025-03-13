import { useMutation } from "convex/react";
import { NodeProps } from "reactflow";
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
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <p className="text-lg font-semibold mb-2">Count: {data.count}</p>
      <button
        className="nodrag bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        onClick={incrementCounter}
      >
        Increment
      </button>
    </div>
  );
}
