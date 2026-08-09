import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Network, FileText, Settings, ChevronRight, Activity, AlertTriangle } from "lucide-react";
import { cn } from "../../utils/classNames";

export function Sidebar() {
  const location = useLocation();

  const links = [
    { path: "/", query: "?view=overview", label: "Overview Dashboard", icon: LayoutDashboard },
    { path: "/", query: "?view=alerts", label: "Alerts Center", icon: AlertTriangle },
    { path: "/org", query: "", label: "Organisation Hierarchy", icon: Network },
  ];

  return (
    <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 h-screen sticky top-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-slate-700 p-2.5 rounded-xl shadow-md border border-slate-600">
            <Activity className="w-5 h-5 text-slate-100 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">FilePulse</h1>
            <p className="text-[10px] text-sky-600 font-bold uppercase tracking-widest mt-0.5">Diagnostic Radar</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-1">
        <div className="px-3 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
          Main Menu
        </div>
        {links.map((link) => {
          const isActivePath = location.pathname === link.path;
          const currentQuery = location.search || "?view=overview";
          const isActiveQuery = link.path === "/" ? currentQuery === link.query : true;
          const active = isActivePath && isActiveQuery;
          const Icon = link.icon;

          return (
            <Link
              key={link.label}
              to={`${link.path}${link.query}`}
              className={cn(
                "group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ease-out relative overflow-hidden",
                active
                  ? "text-sky-700 bg-sky-50 shadow-sm border border-sky-100/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              )}
            >
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-r-full shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
              )}
              <div className="flex items-center gap-3">
                <Icon className={cn("w-5 h-5 transition-transform duration-300", active ? "text-sky-600 scale-110" : "text-slate-400 group-hover:text-slate-600")} />
                {link.label}
              </div>
              {active && <ChevronRight className="w-4 h-4 text-sky-400 translate-x-1" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section (MVP Target User) */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-300 group-hover:scale-105 transition-transform">
            RI
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-sky-700 transition-colors">R. Iyer</p>
            <p className="text-[11px] font-medium text-slate-500 truncate uppercase tracking-wider">Section Officer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
