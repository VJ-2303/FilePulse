import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEmployeeWorkload } from '../api/client';
import { Card, Badge } from '../components/ui';
import { ArrowLeft, User, Briefcase, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchEmployeeWorkload(id);
        setWorkload(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 space-y-4">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-medium animate-pulse">Loading employee profile...</p>
      </div>
    );
  }

  if (!workload) {
    return <div className="p-8 text-rose-500 text-center font-bold">Failed to load employee details.</div>;
  }

  // The backend build_employee_workload returns employee properties directly on the workload object
  const emp = workload;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-5xl mx-auto">

      {/* Header Section */}
      <div className="flex items-start gap-5 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <button
          onClick={() => navigate(-1)}
          className="p-3 mt-1 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500 hover:text-slate-900 border border-slate-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-md shrink-0">
              <User className="w-10 h-10 text-slate-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{emp.name}</h1>
              <div className="text-lg text-slate-500 font-medium mt-1">{emp.role} &bull; {emp.department}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Stats & Meta */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 shadow-xl p-8">
            <h3 className="text-slate-400 font-bold tracking-widest text-xs uppercase mb-6">Workload Overview</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-400">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-semibold text-slate-200">Active Files</span>
                </div>
                <div className="text-3xl font-black text-white">{workload.active_file_count}</div>
              </div>

              <div className="w-full h-px bg-slate-700/50" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold text-slate-200">Alerted Files</span>
                </div>
                <div className="text-3xl font-black text-white">{workload.alerted_file_count}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Assigned Files */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <CheckCircle className="w-6 h-6 text-slate-500" />
              Currently Assigned Files
            </h2>

            {workload.files.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <p className="font-semibold text-lg">No active files assigned.</p>
                <p className="text-sm mt-1">This employee currently has a clear desk.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workload.files.map(file => (
                  <div
                    key={file.file_id}
                    onClick={() => navigate(`/files/${file.file_id}`)}
                    className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-start justify-between gap-5"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-lg font-bold text-slate-800 group-hover:text-sky-700 transition-colors mb-1 leading-snug">{file.title}</h5>
                      <div className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs font-bold shrink-0">{file.file_id}</span>
                        <span className="truncate">{file.file_type}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start gap-2 sm:justify-end sm:max-w-[55%] shrink-0 mt-1 sm:mt-0">
                      <Badge variant={file.priority === 'High' ? 'danger' : 'default'} className="px-3 py-1 text-xs">
                        {file.priority}
                      </Badge>

                      {file.is_overdue && (
                        <Badge variant="danger" className="px-3 py-1 text-xs uppercase tracking-wider">Overdue</Badge>
                      )}

                      {file.days_inactive !== null && file.days_inactive > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200 shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {file.days_inactive} days stuck
                        </div>
                      )}

                      {file.alert_types && file.alert_types.map(alert => (
                        <Badge key={alert} variant="warning" className="px-3 py-1 text-xs uppercase tracking-wider shadow-sm">
                          {alert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
