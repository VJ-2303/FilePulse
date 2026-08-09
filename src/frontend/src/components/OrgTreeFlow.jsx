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
  getStraightPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateTreeLayout } from '../utils/layoutTree';
import { cn } from '../utils/classNames';
import { User, FileText } from 'lucide-react';

const OrgNode = ({ data, isConnectable }) => {
  return (
    <div className={cn(
      "px-8 py-6 rounded-2xl border bg-white shadow-md transition-all min-w-[340px] hover:border-sky-400 hover:shadow-xl cursor-pointer group",
      data.highlighted ? "border-sky-500 shadow-lg ring-4 ring-sky-100" : "border-slate-200",
      data.stuck ? "border-rose-500 shadow-lg ring-4 ring-rose-100" : ""
    )}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="opacity-0" />
      <div className="flex items-start gap-5">
        <div className={cn(
          "p-4 rounded-2xl border shadow-sm shrink-0 transition-colors flex flex-col items-center justify-center",
          data.highlighted ? "bg-sky-100 text-sky-600 border-sky-200" : "bg-slate-50 text-slate-500 border-slate-100 group-hover:bg-sky-50 group-hover:text-sky-600"
        )}>
          <User className="w-10 h-10" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-xl font-black text-slate-900 truncate group-hover:text-sky-700 transition-colors leading-tight">{data.name}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1.5 truncate">{data.role}</div>

          <div className="mt-5 flex items-center gap-3">
            <div className="text-sm font-bold text-slate-600 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit shadow-sm">
              <FileText className="w-5 h-5 text-sky-500" />
              {data.active_files || 0} Files
            </div>
            {data.alerted_files > 0 && (
              <div className="text-sm font-bold text-rose-700 flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 w-fit shadow-sm">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm"></div>
                {data.alerted_files} Alerts
              </div>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="opacity-0" />
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
          className="nodrag nopan bg-sky-500 rounded-xl p-2.5 shadow-xl shadow-sky-500/30 flex items-center justify-center animate-bounce border-[3px] border-white"
        >
          <FileText className="w-6 h-6 text-white" />
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

function FlowContent({ orgTree, currentEvent, onNodeClick }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!orgTree || orgTree.length === 0) return { nodes: [], edges: [] };
    return generateTreeLayout(orgTree);
  }, [orgTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

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

      const highlightStyle = { stroke: '#0ea5e9', strokeWidth: 3 };

      if (existingIdx >= 0) {
        newEdges[existingIdx] = {
          ...newEdges[existingIdx],
          type: 'transferEdge',
          animated: true,
          style: highlightStyle,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#0ea5e9',
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
            color: '#0ea5e9',
          },
        });
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50);
  }, [orgTree, currentEvent, initialNodes, initialEdges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      attributionPosition="bottom-left"
      minZoom={0.1}
    >
      <Background color="#cbd5e1" gap={24} />
      <Controls />
    </ReactFlow>
  );
}

export function OrgTreeFlow({ orgTree, currentEvent = null, onNodeClick = null }) {
  return (
    <div className="w-full h-full min-h-[500px] bg-slate-50/50 rounded-xl border border-slate-200">
      <ReactFlowProvider>
        <FlowContent orgTree={orgTree} currentEvent={currentEvent} onNodeClick={onNodeClick} />
      </ReactFlowProvider>
    </div>
  );
}
