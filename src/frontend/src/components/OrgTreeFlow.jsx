import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  PanOnScrollMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateTreeLayout } from '../utils/layoutTree';
import { cn } from '../utils/classNames';
import { AlertTriangle, FileText, User } from 'lucide-react';

const OrgNode = ({ data, isConnectable }) => {
  const hasAlerts = data.alerted_files > 0;
  const fileCount = data.active_files || 0;

  return (
    <div className={cn(
      "w-[430px] min-h-[176px] overflow-hidden rounded-lg border bg-white shadow-[0_18px_42px_rgba(15,23,42,0.11)] transition-all hover:-translate-y-1 hover:shadow-[0_26px_54px_rgba(14,165,233,0.2)] cursor-pointer group",
      data.highlighted ? "border-sky-500 ring-4 ring-sky-100" : hasAlerts ? "border-amber-300" : "border-slate-200",
      data.stuck ? "border-rose-500 ring-4 ring-rose-100" : ""
    )}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="opacity-0" />
      <div className={cn(
        "h-2 w-full",
        data.highlighted ? "bg-sky-500" : hasAlerts ? "bg-amber-400" : "bg-emerald-400"
      )} />
      <div className="flex items-start gap-5 px-6 py-5">
        <div className={cn(
          "shrink-0 flex h-16 w-16 items-center justify-center rounded-lg border transition-colors",
          data.highlighted ? "border-sky-200 bg-sky-50" : hasAlerts ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
        )}>
          <User className={cn(
            "h-9 w-9 transition-colors",
            data.highlighted ? "text-sky-600" : hasAlerts ? "text-amber-600" : "text-emerald-700"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[26px] font-black leading-tight text-slate-950 transition-colors group-hover:text-sky-700">{data.name}</div>
          <div className="mt-2 truncate text-xs font-bold uppercase tracking-wide text-slate-500">{data.role}</div>
          <div className="mt-2 inline-flex max-w-full items-center rounded-md bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
            <span className="truncate">{data.department}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-base font-black text-slate-700">
              <FileText className="h-5 w-5 text-slate-500" />
              {fileCount} Files
            </div>
            {hasAlerts && (
              <div className="flex w-fit items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-base font-black text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                {data.alerted_files} Alerts
              </div>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="opacity-0" />
    </div>
  );
};

const TransferEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd }) => {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center justify-center rounded-lg border-2 border-white bg-cyan-100 p-2.5 shadow-lg"
        >
          <FileText className="h-5 w-5 text-cyan-700" />
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  orgNode: OrgNode,
};

const edgeTypes = {
  transferEdge: TransferEdge,
};

const DEFAULT_VIEWPORT = { x: 60, y: 330, zoom: 0.62 };

function FlowContent({ orgTree, currentEvent, onNodeClick }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!orgTree || orgTree.length === 0) return { nodes: [], edges: [] };
    return generateTreeLayout(orgTree);
  }, [orgTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { setViewport } = useReactFlow();

  useEffect(() => {
    if (!orgTree || orgTree.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: initialNodes, edges: initialEdges } = generateTreeLayout(orgTree);

    const newNodes = initialNodes.map(node => {
      let highlighted = false;
      let stuck = false;

      if (currentEvent) {
        if (node.id === currentEvent.to_user_id || node.id === currentEvent.from_user_id) {
          highlighted = true;
        }
      }

      return {
        ...node,
        data: {
          ...node.data,
          highlighted,
          stuck
        }
      };
    });

    const newEdges = [...initialEdges];

    // If there's a current event, draw a special edge for the transfer
    if (currentEvent && currentEvent.is_transfer) {
      // Check if this edge already exists in org structure
      const existingIdx = newEdges.findIndex(e =>
        (e.source === currentEvent.from_user_id && e.target === currentEvent.to_user_id) ||
        (e.source === currentEvent.to_user_id && e.target === currentEvent.from_user_id)
      );

      const highlightStyle = { stroke: '#0891b2', strokeWidth: 5 };

      if (existingIdx >= 0) {
        newEdges[existingIdx] = {
          ...newEdges[existingIdx],
          type: 'transferEdge',
          animated: true,
          style: highlightStyle,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#0891b2',
          },
        };
      } else {
        // Draw a new edge that floats across the graph
        newEdges.push({
          id: `transfer-${currentEvent.event_id}`,
          source: currentEvent.from_user_id,
          target: currentEvent.to_user_id,
          animated: true,
          style: highlightStyle,
          type: 'transferEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#0891b2',
          },
        });
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => setViewport(DEFAULT_VIEWPORT, { duration: 800 }), 50);
  }, [orgTree, currentEvent, initialNodes, initialEdges, setNodes, setEdges, setViewport]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultViewport={DEFAULT_VIEWPORT}
      attributionPosition="bottom-left"
      minZoom={0.35}
      maxZoom={1.5}
      nodesDraggable={false}
      panOnScroll
      panOnScrollMode={PanOnScrollMode.Free}
      zoomOnScroll={false}
      zoomOnPinch
      panOnDrag
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#bae6fd" gap={32} size={1.4} />
      <Controls className="rounded-lg border border-slate-200 bg-white shadow-sm" />
    </ReactFlow>
  );
}

export function OrgTreeFlow({ orgTree, currentEvent = null, onNodeClick = null }) {
  return (
    <div className="h-full min-h-[720px] w-full overflow-hidden rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dff7ef_0,#eff6ff_34%,#ffffff_74%)] shadow-inner">
      <ReactFlowProvider>
        <FlowContent orgTree={orgTree} currentEvent={currentEvent} onNodeClick={onNodeClick} />
      </ReactFlowProvider>
    </div>
  );
}
