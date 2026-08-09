import { useEffect, useState } from 'react';
import { fetchOrgTree } from '../api/client';
import { OrgTreeFlow } from '../components/OrgTreeFlow';
import { useNavigate } from 'react-router-dom';

export default function OrgTreePage() {
  const [orgTree, setOrgTree] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const treeData = await fetchOrgTree();
        setOrgTree(treeData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleNodeClick = (event, node) => {
    // Navigate to the newly created separate Employee Details Page
    navigate(`/employees/${node.id}`);
  };

  if (loading) return <div className="p-8 text-slate-500">Loading organization tree...</div>;
  if (!orgTree) return <div className="p-8 text-rose-500">Failed to load org tree.</div>;

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Organisation Hierarchy</h1>
        <p className="text-slate-500 mt-1">Hierarchical view of departments and personnel. Click any profile to view full details and workload.</p>
      </div>
      <div className="relative h-[980px] min-h-[720px] overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <OrgTreeFlow orgTree={orgTree} onNodeClick={handleNodeClick} />
      </div>
    </div>
  );
}
