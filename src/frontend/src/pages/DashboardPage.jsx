import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSummary, fetchAlerts } from '../api/client';
import { Badge } from '../components/ui';
import { AlertCircle, CheckCircle2, TrendingUp, AlertTriangle, Filter, Search, Server, Activity, ArrowRight, FileText } from 'lucide-react';
import { cn } from '../utils/classNames';

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

  if (loading) return (
    <div className="flex h-[calc(100vh-100px)] items-center justify-center bg-slate-50/50 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <Activity className="w-8 h-8 animate-pulse text-sky-500" />
        <div className="font-medium tracking-wide">Initializing Command Center...</div>
      </div>
    </div>
  );

  if (!summary) return (
    <div className="p-8 text-rose-500 bg-rose-50/50 backdrop-blur-md rounded-3xl border border-rose-100 shadow-lg m-4">
      Failed to load data. Ensure backend is running.
    </div>
  );

  // Background Ambience Wrapper
  const AmbientBackground = ({ children }) => (
    <div className="relative min-h-[calc(100vh-100px)] w-full overflow-hidden pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[150px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 p-1">
        {children}
      </div>
    </div>
  );

  if (currentView === 'alerts') {
    return (
      <AmbientBackground>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Alerts Center</h1>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                System Live
              </div>
            </div>
            <p className="text-slate-500 font-medium">Detailed management of all flagged workflow anomalies.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="flex-1 md:w-64 bg-white/60 backdrop-blur-md border border-white/80 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm text-sm text-slate-500 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-300 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search alerts..." className="bg-transparent border-none outline-none w-full text-slate-700 placeholder:text-slate-400" />
            </div>
            <button className="bg-white/60 backdrop-blur-md border border-white/80 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-md transition-all">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="grid gap-5">
          {alerts.map((alert) => (
            <div
              key={alert.file_id}
              onClick={() => navigate(`/files/${alert.file_id}`)}
              className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-sky-700 transition-colors">{alert.file_title}</h3>
                    <Badge variant="info" className="bg-sky-50 text-sky-700 border-sky-200">{alert.file_id}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-5">{alert.file_type} &bull; Currently with <span className="font-bold text-slate-700">{alert.current_holder_name}</span></p>
                  <div className="flex gap-2">
                    {alert.alert_types.map(t => (
                      <Badge key={t} variant={t === 'ROTTING' ? 'danger' : 'warning'} className="shadow-sm">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="md:w-48 flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 pl-0 md:pl-6">
                  <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-widest">Risk Score</div>
                  <div className="text-4xl font-black text-rose-600 flex items-center gap-2 drop-shadow-sm group-hover:scale-105 transition-transform">
                    {Math.round(alert.risk_score)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center p-16 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">All systems optimal</h3>
              <p className="text-slate-500 mt-2 font-medium">No workflow anomalies detected in the current sweep.</p>
            </div>
          )}
        </div>
      </AmbientBackground>
    );
  }

  // Calculate Health
  const totalAnomalies = summary.rotting_files + summary.looping_files + summary.conformance_files;
  const healthPercent = summary.total_active_files > 0
    ? Math.max(0, Math.round(((summary.total_active_files - totalAnomalies) / summary.total_active_files) * 100))
    : 100;

  // Overview View
  return (
    <AmbientBackground>
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Diagnostic Command Center</h1>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Live
            </div>
          </div>
          <p className="text-slate-500 font-medium text-lg">Real-time surveillance of workflow health and systemic bottlenecks.</p>
        </div>
      </div>

      {/* Health Visualization */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.08)] transition-all duration-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Workflow Health Index</h2>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">{healthPercent}%</div>
        </div>
        <div className="w-full h-4 bg-slate-200/50 rounded-full overflow-hidden shadow-inner p-0.5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              healthPercent > 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" :
                healthPercent > 50 ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]" :
                  "bg-gradient-to-r from-rose-400 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
            )}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-2">
        <StatCard icon={FileText} label="Active Files" value={summary.total_active_files} color="text-slate-700" bg="bg-slate-100/80" />
        <StatCard icon={AlertCircle} label="Rotting Files" value={summary.rotting_files} color="text-rose-600" bg="bg-rose-100/80" />
        <StatCard icon={TrendingUp} label="Looping Files" value={summary.looping_files} color="text-amber-600" bg="bg-amber-100/80" />
        <StatCard icon={Server} label="Conformance" value={summary.conformance_files} color="text-sky-600" bg="bg-sky-100/80" />
      </div>

      <div className="pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-rose-100/80 text-rose-600 rounded-xl shadow-sm border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            Critical Bottlenecks
            <span className="text-slate-400 font-medium text-sm hidden md:inline">(Top 3 Highest Risk)</span>
          </h2>
          <button
            onClick={() => navigate('/?view=alerts')}
            className="text-sm font-bold text-sky-700 hover:text-sky-800 bg-white/60 hover:bg-sky-50 backdrop-blur-md px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-sky-200/60 shadow-sm hover:shadow-md"
          >
            Open Alerts Center
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.file_id}
              onClick={() => navigate(`/files/${alert.file_id}`)}
              className="group relative bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(225,29,72,0.08)] hover:border-rose-200/60 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex justify-between items-start mb-4">
                <Badge variant="danger" className="shrink-0 bg-rose-100 text-rose-700 border-rose-200 shadow-sm font-bold">Score: {Math.round(alert.risk_score)}</Badge>
                <div className="flex gap-1.5">
                  {alert.alert_types.map(t => (
                    <Badge key={t} variant={t === 'ROTTING' ? 'danger' : 'warning'} className="text-[10px] shadow-sm">{t}</Badge>
                  ))}
                </div>
              </div>

              <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 group-hover:text-rose-700 transition-colors" title={alert.file_title}>{alert.file_title}</h3>
              <p className="text-sm font-medium text-slate-500 mb-6">Stuck with: <span className="text-slate-700 font-bold">{alert.current_holder_name}</span></p>

              <div className="mt-auto pt-4 border-t border-slate-200/60 flex items-center justify-between opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-sm font-bold text-sky-600">View file journey</span>
                <ArrowRight className="w-4 h-4 text-sky-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="col-span-3 text-center p-12 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 drop-shadow-sm" />
              <p className="text-xl font-bold text-slate-700">No active bottlenecks found.</p>
            </div>
          )}
        </div>
      </div>
    </AmbientBackground>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl group-hover:bg-white/80 transition-colors pointer-events-none" />
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className={cn("p-3.5 rounded-2xl shadow-sm border border-white/50 transition-transform group-hover:scale-110", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-5xl font-black text-slate-800 tracking-tight mb-2 drop-shadow-sm">{value}</p>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}
