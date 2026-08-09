import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSummary, fetchAlerts } from '../api/client';
import { Badge } from '../components/ui';
import { AlertCircle, CheckCircle2, TrendingUp, AlertTriangle, Filter, Search, Server, Activity, ArrowRight, FileText, BarChart3 } from 'lucide-react';
import { cn } from '../utils/classNames';

const AmbientBackground = ({ children }) => (
  <div className="w-full pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
    {children}
  </div>
);

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [charts, setCharts] = useState({
    weekly_clearance: [
      { week_start: '2025-01-27', label: 'W4 Jan', cleared_files: 12 },
      { week_start: '2025-02-10', label: 'W2 Feb', cleared_files: 18 },
      { week_start: '2025-03-03', label: 'W1 Mar', cleared_files: 9 },
      { week_start: '2025-03-17', label: 'W3 Mar', cleared_files: 24 },
      { week_start: '2025-03-31', label: 'W5 Mar', cleared_files: 15 },
    ],
    looping_identification: [
      { week_start: '2025-01-06', label: 'W2 Jan', file_id: 'F5001', file_title: 'NH-48 Culvert Repair Estimate', round_trips: 6, bounces: 4, risk_score: 81 },
      { week_start: '2025-01-10', label: 'W2 Jan', file_id: 'F5002', file_title: 'District Hospital Approach Road Repair', round_trips: 5, bounces: 3, risk_score: 79 },
      { week_start: '2025-01-14', label: 'W3 Jan', file_id: 'F5003', file_title: 'Government School Building Roof Replacement', round_trips: 4, bounces: 3, risk_score: 78 },
      { week_start: '2025-01-20', label: 'W4 Jan', file_id: 'F5004', file_title: 'Rural Drinking Water Pipeline Extension', round_trips: 2, bounces: 1, risk_score: 35 },
      { week_start: '2025-01-24', label: 'W4 Jan', file_id: 'F5005', file_title: 'Urban Drainage Improvement Package', round_trips: 3, bounces: 2, risk_score: 55 },
      { week_start: '2025-02-03', label: 'W1 Feb', file_id: 'F5007', file_title: 'Bridge Safety Inspection – River Crossing', round_trips: 4, bounces: 3, risk_score: 65 },
      { week_start: '2025-02-17', label: 'W3 Feb', file_id: 'F5010', file_title: 'Storm Water Drain Desilting Contract', round_trips: 2, bounces: 1, risk_score: 42 },
    ]
  });
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

  // AmbientBackground moved outside component to prevent focus loss

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
              <input 
                type="text" 
                placeholder="Search alerts..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-700 placeholder:text-slate-400" 
              />
            </div>
            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="appearance-none bg-white/60 backdrop-blur-md border border-white/80 rounded-xl pl-10 pr-8 py-2.5 flex items-center gap-2 shadow-sm text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-md transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 cursor-pointer"
              >
                <option value="ALL">All Alerts</option>
                <option value="ROTTING">Rotting</option>
                <option value="LOOPING">Looping</option>
              </select>
              <Filter className="w-4 h-4 absolute left-3.5 top-3 text-slate-700 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          {alerts
            .filter(alert => {
              const matchesSearch = alert.file_title.toLowerCase().includes(searchQuery.toLowerCase()) || alert.file_id.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesFilter = filterType === 'ALL' || alert.alert_types.includes(filterType);
              return matchesSearch && matchesFilter;
            })
            .map((alert) => (
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
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-slate-500" />
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
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
              </span>
              System Live
            </div>
          </div>
          <p className="text-slate-500 font-medium text-lg">Real-time surveillance of workflow health and systemic bottlenecks.</p>
        </div>
      </div>

      {/* Health Visualization removed */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-2">
        <StatCard icon={FileText} label="Active Files" value={summary.total_active_files} color="text-slate-700" bg="bg-slate-100/80" />
        <StatCard icon={AlertCircle} label="Rotting Files" value={summary.rotting_files} color="text-rose-600" bg="bg-rose-100/80" />
        <StatCard icon={TrendingUp} label="Looping Files" value={summary.looping_files} color="text-amber-600" bg="bg-amber-100/80" />
        <StatCard icon={Server} label="Conformance" value={summary.conformance_files} color="text-sky-600" bg="bg-sky-100/80" />
      </div>

      <div className="pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl shadow-sm border border-slate-200">
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
              <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto mb-4 drop-shadow-sm" />
              <p className="text-xl font-bold text-slate-700">No active bottlenecks found.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <WeeklyClearanceLineChart data={charts.weekly_clearance} />
        <LoopingPieChart data={charts.looping_identification} />
      </div>
    </AmbientBackground>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl group-hover:bg-white/80 transition-colors pointer-events-none" />
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="p-3.5 rounded-2xl shadow-sm border border-slate-200 bg-slate-50 text-slate-600 transition-transform group-hover:scale-110">
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

function WeeklyClearanceLineChart({ data }) {
  const maxCount = Math.max(...data.map((item) => item.cleared_files), 1);
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = { top: 18, right: 30, bottom: 44, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const step = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  const points = data.map((item, index) => {
    const x = padding.left + index * step;
    const y = padding.top + innerHeight - (item.cleared_files / maxCount) * innerHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = points.length > 0 ? `M ${points[0].split(',')[0]},${padding.top + innerHeight} L ${points.join(' L ')} L ${points[points.length - 1].split(',')[0]},${padding.top + innerHeight} Z` : '';

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Weekly File Clearance</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium">Closed files grouped by the week of their last recorded activity.</p>
        </div>
        <Badge variant="success" className="shrink-0">3D Line</Badge>
      </div>

      {data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-slate-500 font-medium">
          No closed files available for the selected period.
        </div>
      ) : (
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[260px] w-full overflow-visible">
          <defs>
            <filter id="shadow-3d" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.4"/>
            </filter>
          </defs>

          {[0, 0.5, 1].map((tick) => {
            const y = padding.top + innerHeight - innerHeight * tick;
            return (
              <g key={tick}>
                <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
                <text x={14} y={y + 4} className="fill-slate-400" fontSize="11" fontWeight="600">
                  {Math.round(maxCount * tick)}
                </text>
              </g>
            );
          })}

          {/* 3D Ribbon Extrusion */}
          {Array.from({ length: 15 }).map((_, i) => {
            const d = 14 - i; // 14 down to 0
            const isTop = d === 0;
            const strokeColor = isTop ? '#0ea5e9' : '#0369a1';
            return (
              <path
                key={d}
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isTop ? "4" : "4"}
                strokeLinecap="round"
                strokeLinejoin="round"
                transform={`translate(0, ${d * 1.5})`}
                filter={isTop ? 'url(#shadow-3d)' : ''}
              />
            );
          })}

          {/* 3D Dots & Labels */}
          {data.map((item, index) => {
            const x = padding.left + index * step;
            const y = padding.top + innerHeight - (item.cleared_files / maxCount) * innerHeight;
            return (
              <g key={item.week_start}>
                {Array.from({ length: 8 }).map((_, i) => {
                  const d = 7 - i;
                  const isTop = d === 0;
                  const fill = isTop ? '#ffffff' : '#bae6fd';
                  const stroke = isTop ? '#0ea5e9' : '#0369a1';
                  return (
                    <circle 
                      key={d} cx={x} cy={y} r={isTop ? "5" : "4.5"} 
                      fill={fill} stroke={stroke} strokeWidth="2.5"
                      transform={`translate(0, ${d * 1.5})`}
                    />
                  )
                })}
                <text x={x} y={chartHeight - 18} textAnchor="middle" className="fill-slate-500" fontSize="11" fontWeight="600">
                  {item.label}
                </text>
                <text x={x} y={y - 15} textAnchor="middle" className="fill-slate-700" fontSize="12" fontWeight="800">
                  {item.cleared_files}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function LoopingPieChart({ data }) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  data.forEach(item => {
    if (item.risk_score >= 70) counts.High++;
    else if (item.risk_score >= 40) counts.Medium++;
    else counts.Low++;
  });
  
  const total = counts.High + counts.Medium + counts.Low;
  
  const slices = [
    { label: 'High Risk', count: counts.High, color: '#e11d48', topColor: '#e11d48', sideColor: '#9f1239' }, 
    { label: 'Medium Risk', count: counts.Medium, color: '#f59e0b', topColor: '#f59e0b', sideColor: '#b45309' }, 
    { label: 'Low Risk', count: counts.Low, color: '#0d9488', topColor: '#0d9488', sideColor: '#0f766e' }, 
  ].filter(s => s.count > 0);

  let cumulativePercent = 0;
  
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Looping Resolution Breakdown</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium">Distribution of looping files by their systemic risk severity.</p>
        </div>
        <Badge variant="warning" className="shrink-0">Pie</Badge>
      </div>

      {data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-slate-500 font-medium">
          No looping files detected.
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 py-4">
          <svg viewBox="-1.2 -1.5 2.4 3" className="h-[220px] w-[220px] drop-shadow-2xl overflow-visible">
            <g transform="scale(1, 0.6)">
              {Array.from({ length: 30 }).map((_, i) => {
                const d = 29 - i; // 29 down to 0
                const isTop = d === 0;
                let currentPercent = 0;
                
                return (
                  <g key={d} transform={`translate(0, ${d * 0.025})`}>
                    {slices.map((slice) => {
                      const startPercent = currentPercent;
                      const slicePercent = slice.count / total;
                      currentPercent += slicePercent;
                      const endPercent = currentPercent;

                      const [startX, startY] = getCoordinatesForPercent(startPercent);
                      const [endX, endY] = getCoordinatesForPercent(endPercent);

                      const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                      const pathData = slicePercent === 1
                        ? `M 1 0 A 1 1 0 1 1 1 -0.0001 Z`
                        : `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                      return (
                        <path
                          key={slice.label}
                          d={pathData}
                          fill={isTop ? slice.topColor : slice.sideColor}
                          stroke={isTop ? '#ffffff' : slice.sideColor}
                          strokeWidth={isTop ? "0.02" : "0.01"}
                        >
                          <title>{`${slice.label}: ${slice.count} files`}</title>
                        </path>
                      );
                    })}
                    <circle cx="0" cy="0" r="0.5" fill={isTop ? "#ffffff" : "#e2e8f0"} />
                    {isTop && (
                      <g transform="scale(1, 1.66)">
                        <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800" fontSize="0.35" fontWeight="900">
                          {total}
                        </text>
                        <text x="0" y="0.22" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500" fontSize="0.12" fontWeight="700">
                          FILES
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="flex flex-col gap-5">
            {slices.map(slice => (
              <div key={slice.label} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full shadow-inner border border-white" style={{ backgroundColor: slice.color }} />
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{slice.label}</div>
                  <div className="text-3xl font-black text-slate-800 leading-none">{slice.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
