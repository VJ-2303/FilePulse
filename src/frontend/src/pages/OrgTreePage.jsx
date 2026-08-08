import { useEffect, useState } from 'react';
import { fetchOrgTree, fetchEmployeeWorkload } from '../api/client';
import { OrgTreeFlow } from '../components/OrgTreeFlow';
import { Card, Badge } from '../components/ui';
import { X, User, Briefcase, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OrgTreePage() {
  const [orgTree, setOrgTree] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
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

  const handleNodeClick = async (event, node) => {
    const employeeId = node.id;
    setSelectedEmployee(node.data);
    setLoadingWorkload(true);
    setWorkload(null);
    try {
      const data = await fetchEmployeeWorkload(employeeId);
      setWorkload(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWorkload(false);
    }
  };

  const closePanel = () => {
    setSelectedEmployee(null);
    setWorkload(null);
  };

  if (loading) return <div className="p-8 text-slate-500">Loading organization tree...</div>;
  if (!orgTree) return <div className="p-8 text-rose-500">Failed to load org tree.</div>;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organization Family Tree</h1>
        <p className="text-slate-500 mt-1">Hierarchical view of departments and personnel. Click any profile to view workload.</p>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
        <OrgTreeFlow orgTree={orgTree} onNodeClick={handleNodeClick} />
        
        {selectedEmployee && (
          <div className="absolute top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl animate-in slide-in-from-right-8 duration-300 z-10 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedEmployee.label}</h3>
                  <p className="text-sm text-slate-500">{selectedEmployee.role}</p>
                </div>
              </div>
              <button onClick={closePanel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {loadingWorkload ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-3">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium animate-pulse">Loading workload profile...</p>
                </div>
              ) : workload ? (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                      <div className="flex items-center gap-2 text-sky-600 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                      </div>
                      <div className="text-2xl font-black text-sky-900">{workload.active_file_count}</div>
                    </div>
                    <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                      <div className="flex items-center gap-2 text-rose-600 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Alerted</span>
                      </div>
                      <div className="text-2xl font-black text-rose-900">{workload.alerted_file_count}</div>
                    </div>
                  </div>

                  {/* File List */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Assigned Files
                    </h4>
                    {workload.files.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No active files assigned.</p>
                    ) : (
                      <div className="space-y-3">
                        {workload.files.map(file => (
                          <div 
                            key={file.file_id}
                            onClick={() => navigate(`/files/${file.file_id}`)}
                            className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors">{file.title}</h5>
                                <div className="text-xs text-slate-500 font-medium">{file.file_id} &bull; {file.file_type}</div>
                              </div>
                              <Badge variant={file.priority === 'High' ? 'danger' : 'default'}>{file.priority}</Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                              {file.is_overdue && (
                                <Badge variant="danger" className="text-[10px]">Overdue</Badge>
                              )}
                              {file.days_inactive !== null && file.days_inactive > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                                  <Clock className="w-3 h-3" />
                                  {file.days_inactive} days stuck
                                </div>
                              )}
                              {file.alert_types.map(alert => (
                                <Badge key={alert} variant="warning" className="text-[10px]">{alert}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
