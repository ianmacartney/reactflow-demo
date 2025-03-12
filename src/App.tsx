"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { MouseEvent as ReactMouseEvent, useCallback, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Controls,
  EdgeChange,
  MiniMap,
  NodeChange,
  ReactFlowInstance
} from "reactflow";
import { api } from "../convex/_generated/api";
import CounterNode from "./components/CounterNode";

const nodeTypes = {
  default: CounterNode
};

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        Convex + React + Convex Auth
        <SignOutButton />
      </header>
      <main className="p-8 flex flex-col gap-16">
        <h1 className="text-4xl font-bold text-center">
          Convex + React + Convex Auth
        </h1>
        <Authenticated>
          <Content />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-200 dark:bg-slate-800 text-foreground rounded-md px-2 py-1"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      )}
    </>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Log in to see the numbers</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            setError(error.message);
          });
        }}
      >
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          type="email"
          name="email"
          placeholder="Email"
        />
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
        />
        <button
          className="bg-foreground text-background rounded-md"
          type="submit"
        >
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <div className="flex flex-row gap-2">
          <span>
            {flow === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <span
            className="text-foreground underline hover:no-underline cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </span>
        </div>
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500/50 rounded-md p-2">
            <p className="text-foreground font-mono text-xs">
              Error signing in: {error}
            </p>
          </div>
        )}
      </form>
      <p>Or, if you're just checking it out...</p>
      <button
        className="bg-foreground text-background rounded-md"
        onClick={() => void signIn("anonymous")}
      >
        Log in anonymously
      </button>
    </div>
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
  const edges = useQuery(api.reactflow.edges.get, { diagramId });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  const updateNodes = useMutation(
    api.reactflow.nodes.update,
  ).withOptimisticUpdate((store, args) => {
    const nodes = store.getQuery(api.reactflow.nodes.get, { diagramId }) ?? [];
    const updated = applyNodeChanges(args.changes, nodes);
    store.setQuery(api.reactflow.nodes.get, { diagramId }, updated);
  });
  
  const createNode = useMutation(api.reactflow.nodes.create).withOptimisticUpdate((store, args) => {
    const nodes = store.getQuery(api.reactflow.nodes.get, { diagramId }) ?? [];
    const newNode = {
      id: args.nodeId,
      position: args.position,
      data: args.data,
      type: 'default'
    };
    store.setQuery(api.reactflow.nodes.get, { diagramId }, [...nodes, newNode]);
  });
  
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
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
      connect({ diagramId, connection });
    },
    [connect],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);
  
  const onPaneClick = useCallback(
    (event: ReactMouseEvent<Element, MouseEvent>) => {
      if (reactFlowInstance && event.target instanceof HTMLElement && event.target.classList.contains('react-flow__pane')) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        
        const randomValue = Math.floor(Math.random() * 100);
        const nodeId = `node-${Math.floor(Math.random() * 10000)}`;
        
        createNode({ 
          diagramId, 
          nodeId, 
          position, 
          data: { foo: randomValue } 
        });
      }
    },
    [reactFlowInstance, createNode, diagramId]
  );

  if (nodes === undefined || edges === undefined) {
    return (
      <div className="mx-auto">
        <p>loading... (consider a loading skeleton)</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen" ref={reactFlowWrapper}>
      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
