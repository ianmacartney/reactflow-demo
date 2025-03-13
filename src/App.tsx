"use client";

import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  MouseEvent as ReactMouseEvent,
  TouchEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Controls,
  EdgeChange,
  MiniMap,
  NodeChange,
  ReactFlowInstance,
} from "reactflow";
import { api } from "../convex/_generated/api";
import { SignInForm, SignOutButton } from "./Auth";
import CounterNode from "./components/CounterNode";

const nodeTypes = {
  default: CounterNode,
};

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        Convex + ReactFlow
        <SignOutButton />
      </header>
      <main className="flex flex-col gap-16">
        <h1 className="text-4xl font-bold text-center">Convex + ReactFlow</h1>
        <Authenticated>
          <p>
            This is a simple example of how to use Convex with ReactFlow. Click
            to create nodes, and connect them with edges by dragging from the
            handles.
          </p>
          <Content />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

if (window.location.hash.length <= 1) {
  window.location.hash = `#diagram-${crypto.randomUUID()}`;
}
window.addEventListener("hashchange", () => {
  window.location.reload();
});
const diagramId = window.location.hash.slice(1);

function Content() {
  const nodes = useQuery(api.reactflow.nodes.get, { diagramId });
  // Combine data with local state to change nodes here
  const edges = useQuery(api.reactflow.edges.get, { diagramId });
  // Combine data with local state to change edges here
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  const updateNodes = useMutation(
    api.reactflow.nodes.update,
  ).withOptimisticUpdate((store, args) => {
    const nodes = store.getQuery(api.reactflow.nodes.get, { diagramId }) ?? [];
    const updated = applyNodeChanges(args.changes, nodes);
    store.setQuery(api.reactflow.nodes.get, { diagramId }, updated);
  });

  const createNode = useMutation(
    api.reactflow.nodes.create,
  ).withOptimisticUpdate((store, args) => {
    const nodes = store.getQuery(api.reactflow.nodes.get, { diagramId }) ?? [];
    const newNode = {
      id: args.nodeId,
      position: args.position,
      data: args.data,
      type: "default",
    };
    store.setQuery(api.reactflow.nodes.get, { diagramId }, [...nodes, newNode]);
    const sourceNode = args.sourceNode;
    if (sourceNode) {
      const source = nodes.find((node) => node.id === sourceNode.id);
      if (source) {
        const targetHandle =
          source.position.y > args.position.y ? "top" : "bottom";
        const newEdges = addEdge(
          {
            id: crypto.randomUUID(),
            source: source.id,
            target: args.nodeId,
            sourceHandle: sourceNode.handlepos,
            targetHandle,
          },
          [],
        );
        const edges =
          store.getQuery(api.reactflow.edges.get, { diagramId }) ?? [];
        store.setQuery(api.reactflow.edges.get, { diagramId }, [
          ...edges,
          ...newEdges,
        ]);
      }
    }
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Separate out data to sync here
      console.log("onNodesChange", { changes });
      updateNodes({ diagramId, changes });
    },
    [updateNodes],
  );

  const updateEdges = useMutation(
    api.reactflow.edges.update,
  ).withOptimisticUpdate((store, args) => {
    const edges = store.getQuery(api.reactflow.edges.get, { diagramId }) ?? [];
    const updated = applyEdgeChanges(args.changes, edges);
    store.setQuery(api.reactflow.edges.get, { diagramId }, updated);
  });

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Separate out data to sync here
      console.log("onEdgesChange", { changes });
      updateEdges({ diagramId, changes });
    },
    [updateEdges],
  );

  const connect = useMutation(api.reactflow.edges.connect).withOptimisticUpdate(
    (store, args) => {
      const edges =
        store.getQuery(api.reactflow.edges.get, { diagramId }) ?? [];
      const updated = addEdge(args.connection, edges);
      store.setQuery(api.reactflow.edges.get, { diagramId }, updated);
    },
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("onConnect", { connection });
      connect({ diagramId, connection });
    },
    [connect],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const [connectSource, setConnectSource] = useState<
    { id: string; handlepos: string } | undefined
  >(undefined);

  const onConnectStart = useCallback(
    (event: ReactMouseEvent<Element, MouseEvent> | TouchEvent<Element>) => {
      console.log("onConnectStart", { event });
      // get the edge being created
      const dataset = (event.target as HTMLElement).dataset;
      const node = reactFlowInstance
        ?.getNodes()
        .find((node) => node.id === dataset?.nodeid);
      const handlepos = dataset?.handlepos;
      if (node && handlepos) {
        setConnectSource({ id: node.id, handlepos });
      }
      console.log("starting connect", connectSource);
    },
    [reactFlowInstance],
  );

  const onPaneClick = useCallback(
    (event: ReactMouseEvent<Element, MouseEvent>) => {
      if (
        reactFlowInstance &&
        event.target instanceof HTMLElement &&
        event.target.classList.contains("react-flow__pane")
      ) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - 150,
          y: event.clientY - 22,
        });

        const randomValue = Math.floor(Math.random() * 100);
        const nodeId = `node-${Math.floor(Math.random() * 10000)}`;

        console.log("onPaneClick", { event, position, nodeId });
        // Combine data to sync up / split out
        createNode({
          diagramId,
          nodeId,
          position,
          data: { count: randomValue, count2: randomValue, foo: "bar" },
          sourceNode: connectSource,
        });
        setConnectSource(undefined);
      }
    },
    [reactFlowInstance, createNode, diagramId],
  );

  if (nodes === undefined || edges === undefined) {
    return (
      <div className="mx-auto">
        <p>loading... (consider a loading skeleton)</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-screen h-screen border-2 border-slate-200 dark:border-slate-800 rounded-md"
      ref={reactFlowWrapper}
    >
      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnectStart={onConnectStart}
          onConnect={onConnect}
          onInit={onInit}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
