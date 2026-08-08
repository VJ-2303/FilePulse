import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSummary, fetchAlerts } from '../api/client';
import { Card, Badge } from '../components/ui';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, AlertTriangle, Filter, Search } from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';

  useEffect(() => {
    async function loadData() {
      try {
        const [sumData, alertsData] = await Promise.all([
          fetchSummary(),
          fetchAlerts()
        ]);
        setSummary(sumData);
        setAlerts(alertsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading diagnostic data...</div>;
  if (!summary) return <div className="p-8 text-rose-500">Failed to load data. Ensure backend is running.</div>;

  if (currentView === 'alerts') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Alerts Center</h1>
            <p className="text-slate-500 mt-1">Detailed management of all flagged workflow anomalies.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm text-sm text-slate-500">
              <Search className="w-4 h-4" />
              Search alerts...
            </div>
            <button className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.file_id} className="hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate(`/files/${alert.file_id}`)}>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-sky-700 transition-colors">{alert.file_title}</h3>
                    <Badge variant="info">{alert.file_id}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">{alert.file_type} &bull; Assigned to <span className="font-semibold text-slate-800">{alert.current_holder_name}</span></p>
                  <div className="flex gap-2">
                    {alert.alert_types.map(t => (
                      <Badge key={t} variant={t === 'ROTTING' ? 'danger' : 'warning'}>{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="md:w-48 flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 pl-0 md:pl-6">
                  <div className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wider">Risk Score</div>
                  <div className="text-3xl font-black text-rose-600 flex items-center gap-2">
                    {Math.round(alert.risk_score)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {alerts.length === 0 && (
            <div className="text-center p-12 bg-white rounded-xl border border-slate-200 border-dashed">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">All clear!</h3>
              <p className="text-slate-500 mt-1">No alerts found in the system.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback to Overview
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Diagnostic Dashboard</h1>
        <p className="text-slate-500 mt-1">Real-time overview of workflow bottlenecks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Active Files" value={summary.total_active_files} />
        <StatCard icon={AlertCircle} label="Rotting Files" value={summary.rotting_files} color="text-rose-500" />
        <StatCard icon={TrendingUp} label="Looping Files" value={summary.looping_files} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label="Conformance Issues" value={summary.conformance_files} color="text-sky-500" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Critical Bottlenecks (Top 3)
          </h2>
          <button 
            onClick={() => navigate('/?view=alerts')}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            Open Alerts Center
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.slice(0, 3).map((alert) => (
            <Card key={alert.file_id} className="border-rose-100 bg-rose-50/30 hover:border-rose-300 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/files/${alert.file_id}`)}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800 truncate pr-2" title={alert.file_title}>{alert.file_title}</h3>
                <Badge variant="danger" className="shrink-0">{Math.round(alert.risk_score)}</Badge>
              </div>
              <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-1">With: <span className="text-slate-700">{alert.current_holder_name}</span></p>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {alert.alert_types.map(t => (
                  <Badge key={t} variant={t === 'ROTTING' ? 'danger' : 'warning'} className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </Card>
          ))}
          {alerts.length === 0 && (
            <div className="col-span-3 text-center p-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">No active bottlenecks found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { FileText } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color = "text-slate-700" }) {
  return (
    <Card className="flex items-center p-5 gap-4">
      <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  );
}
