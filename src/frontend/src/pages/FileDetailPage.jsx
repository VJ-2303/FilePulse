import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchFileJourney } from "../api/client";
import { Card, Badge } from "../components/ui";
import {
  ArrowLeft,
  Clock,
  FileText,
  Lightbulb,
  Activity,
  Calendar,
  User,
  ArrowRight,
  Map,
} from "lucide-react";
import { cn } from "../utils/classNames";

export default function FileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const journey = await fetchFileJourney(id);
        setData(journey);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading)
    return (
      <div className="p-8 text-slate-500">Loading file information...</div>
    );
  if (!data)
    return (
      <div className="p-8 text-rose-500">Failed to load file information.</div>
    );

  const { file, events, ai_insight } = data;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 mt-1 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {file.title}
              </h1>
              <Badge
                variant="info"
                className="text-xs uppercase tracking-widest px-2"
              >
                {file.file_id}
              </Badge>
              <Badge
                variant={file.priority === "High" ? "danger" : "default"}
                className="text-xs uppercase px-2"
              >
                {file.priority} Priority
              </Badge>
              {file.is_overdue && (
                <Badge variant="danger" className="text-xs uppercase px-2">
                  Overdue
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> {file.file_type}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" /> Currently with:{" "}
                <span className="text-slate-800 font-bold">
                  {file.current_holder_name}
                </span>
              </span>
              {file.days_inactive > 0 && (
                <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  <Clock className="w-4 h-4" /> {file.days_inactive} days stuck
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Navigation */}
        <div className="flex self-start md:self-auto">
          <button
            onClick={() => navigate(`/files/${id}/journey`)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 bg-slate-900 text-white shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:bg-slate-800 border border-slate-800 hover:-translate-y-0.5"
          >
            <Map className="w-4 h-4 text-sky-400" />
            Open Cinematic Journey
          </button>
        </div>
      </div>

      {/* Content: DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white/50">
            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 border-b border-slate-200/60 pb-4">
              <Activity className="w-6 h-6 text-sky-500" />
              File Movement History
            </h2>
            <div className="relative pl-8 space-y-8 before:absolute before:inset-y-0 before:left-2.5 before:w-1 before:bg-slate-100 before:rounded-full py-2">
              {events.map((evt) => (
                <div key={evt.event_id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[40px] w-5 h-5 rounded-full bg-white border-[4px] border-slate-300 group-hover:border-sky-400 transition-colors shadow-[0_0_0_4px_white] z-10 top-6" />

                  {/* Content Container */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    {/* Timestamp & Phase */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className="bg-slate-100 text-slate-600 border-transparent shadow-none px-3 py-1"
                        >
                          {evt.stage} Phase
                        </Badge>
                      </div>
                      <div className="text-[13px] font-bold text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {new Date(evt.timestamp).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>

                    {/* Action Flow */}
                    <div className="mb-4">
                      {evt.is_transfer ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          {/* Sender */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                From
                              </div>
                              <div className="font-bold text-slate-900 truncate">
                                {evt.from_user_name}
                              </div>
                            </div>
                          </div>

                          {/* Action Arrow */}
                          <div className="flex flex-row sm:flex-col items-center justify-center px-4 shrink-0">
                            <div className="text-[10px] font-black text-sky-600 uppercase tracking-widest bg-sky-100 px-2 py-0.5 rounded shadow-sm mb-0 sm:mb-1 mr-2 sm:mr-0">
                              {evt.action}
                            </div>
                            <div className="hidden sm:block w-full h-px bg-slate-200 relative mt-2">
                              <ArrowRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 bg-slate-50/50" />
                            </div>
                            <ArrowRight className="sm:hidden w-4 h-4 text-slate-400" />
                          </div>

                          {/* Receiver */}
                          <div className="flex items-center gap-3 flex-1 sm:justify-end text-left sm:text-right">
                            <div className="min-w-0 order-2 sm:order-1">
                              <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-0.5">
                                To
                              </div>
                              <div className="font-bold text-sky-700 truncate">
                                {evt.to_user_name}
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center shadow-sm shrink-0 order-1 sm:order-2">
                              <User className="w-5 h-5 text-sky-500" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                              Action by: {evt.from_user_name}
                            </div>
                            <div className="font-black text-slate-800 text-lg">
                              {evt.action}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    {evt.note_text && (
                      <div className="mt-4 bg-amber-50/40 border border-amber-100/50 p-4 rounded-xl relative">
                        <div className="flex gap-3">
                          <div className="text-amber-300 font-serif text-4xl leading-none mt-1">
                            "
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed text-[14px]">
                            {evt.note_text}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              File Metadata
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created At</span>
                <span className="font-semibold text-slate-800">
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deadline</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(file.deadline_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Days to Deadline</span>
                <span
                  className={cn(
                    "font-bold",
                    file.days_to_deadline < 0
                      ? "text-rose-600"
                      : "text-emerald-600",
                  )}
                >
                  {file.days_to_deadline} days
                </span>
              </div>
            </div>
          </Card>

          {ai_insight && (
            <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
              <div className="flex items-start gap-3">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg mt-0.5 shadow-sm">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sky-900 mb-2">
                    AI Diagnostic Insight
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">
                    {ai_insight.plain_language_summary}
                  </p>

                  {ai_insight.likely_blocker && (
                    <div className="mb-3 bg-white p-2.5 rounded-lg border border-sky-100">
                      <h4 className="text-xs font-black text-sky-800 uppercase tracking-widest mb-1">
                        Likely Blocker
                      </h4>
                      <p className="text-sm text-slate-700">
                        {ai_insight.likely_blocker}
                      </p>
                    </div>
                  )}

                  {ai_insight.recommended_action && (
                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                      <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">
                        Recommended Action
                      </h4>
                      <p className="text-sm text-emerald-900 font-medium">
                        {ai_insight.recommended_action}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
