import { useMutation } from 'convex/react';
import { NodeProps } from 'reactflow';
import { api } from '../../convex/_generated/api';

type CounterData = {
  foo: number;
};

export default function CounterNode({ id, data }: NodeProps<CounterData>) {
  const updateNodeData = useMutation(api.reactflow.nodes.updateNodeData);
  const diagramId = window.location.hash.slice(1);

  const incrementCounter = () => {
    // Use the new updateNodeData mutation
    updateNodeData({
      diagramId,
      nodeId: id,
      data: { foo: data.foo + 1 }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <p className="text-lg font-semibold mb-2">Count: {data.foo}</p>
      <button 
        className="nodrag bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        onClick={incrementCounter}
      >
        Increment
      </button>
    </div>
  );
} 