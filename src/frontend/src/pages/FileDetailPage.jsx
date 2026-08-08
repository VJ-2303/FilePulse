import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchFileJourney, fetchOrgTree } from '../api/client';
import { OrgTreeFlow } from '../components/OrgTreeFlow';
import { Card, Badge } from '../components/ui';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, FileText, AlertTriangle, Lightbulb, Activity, Network as NetworkIcon, Calendar, User, Info, ArrowRight } from 'lucide-react';
import { cn } from '../utils/classNames';

export default function FileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'details';
  
  const [data, setData] = useState(null);
  const [orgTree, setOrgTree] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State for interactive step-by-step
  const [stepIndex, setStepIndex] = useState(-1);

  useEffect(() => {
    async function loadData() {
      try {
        const [journey, tree] = await Promise.all([
          fetchFileJourney(id),
          fetchOrgTree()
        ]);
        setData(journey);
        setOrgTree(tree);
        // Start at the latest event
        if (journey.events && journey.events.length > 0) {
          setStepIndex(journey.events.length - 1);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Loading file information...</div>;
  if (!data || !orgTree) return <div className="p-8 text-rose-500">Failed to load file information.</div>;

  const { file, alerts, events, ai_insight } = data;
  const currentEvent = stepIndex >= 0 && stepIndex < events.length ? events[stepIndex] : null;

  const nextStep = () => setStepIndex(s => Math.min(events.length - 1, s + 1));
  const prevStep = () => setStepIndex(s => Math.max(0, s - 1));

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{file.title}</h1>
              <Badge variant="info" className="text-xs uppercase tracking-widest px-2">{file.file_id}</Badge>
              <Badge variant={file.priority === 'High' ? 'danger' : 'default'} className="text-xs uppercase px-2">{file.priority} Priority</Badge>
              {file.is_overdue && <Badge variant="danger" className="text-xs uppercase px-2">Overdue</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {file.file_type}</span>
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> Currently with: <span className="text-slate-800 font-bold">{file.current_holder_name}</span></span>
              {file.days_inactive > 0 && <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md"><Clock className="w-4 h-4" /> {file.days_inactive} days stuck</span>}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/60 self-start md:self-auto">
          <button 
            onClick={() => handleTabChange('details')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300",
              activeTab === 'details' ? "bg-white text-sky-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Info className="w-4 h-4" />
            File Details
          </button>
          <button 
            onClick={() => handleTabChange('journey')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300",
              activeTab === 'journey' ? "bg-white text-sky-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <NetworkIcon className="w-4 h-4" />
            Interactive Journey
          </button>
        </div>
      </div>

      {/* Tab Content: DETAILS */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
          
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Activity className="w-5 h-5 text-sky-600" />
                Comprehensive Timeline
              </h2>
              <div className="relative pl-6 space-y-8 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200 py-4">
                {events.map((evt, idx) => (
                  <div key={evt.event_id} className="relative">
                    <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-white border-4 border-sky-500 shadow-sm" />
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-slate-200 text-slate-700">{evt.action}</Badge>
                          <span className="text-sm font-bold text-slate-800">{evt.stage} Phase</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(evt.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                      
                      {evt.is_transfer ? (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100 mb-3">
                          <span className="bg-slate-100 px-2 py-1 rounded">{evt.from_user_name}</span>
                          <ArrowRight className="w-4 h-4 text-sky-400" />
                          <span className="bg-sky-50 text-sky-700 px-2 py-1 rounded">{evt.to_user_name}</span>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-slate-700 mb-3 bg-white p-2.5 rounded-lg border border-slate-100">
                          Action by: <span className="text-sky-700">{evt.from_user_name}</span>
                        </div>
                      )}
                      
                      <div className="text-sm text-slate-600 italic border-l-2 border-sky-300 pl-3">
                        "{evt.note_text}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">File Metadata</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Created At</span>
                  <span className="font-semibold text-slate-800">{new Date(file.created_at).toLocaleDateString()}</span>
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
                  <span className={cn("font-bold", file.days_to_deadline < 0 ? "text-rose-600" : "text-emerald-600")}>
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
                    <h3 className="font-bold text-sky-900 mb-2">AI Diagnostic Insight</h3>
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">
                      {ai_insight.plain_language_summary}
                    </p>
                    
                    {ai_insight.likely_blocker && (
                      <div className="mb-3 bg-white p-2.5 rounded-lg border border-sky-100">
                        <h4 className="text-xs font-black text-sky-800 uppercase tracking-widest mb-1">Likely Blocker</h4>
                        <p className="text-sm text-slate-700">{ai_insight.likely_blocker}</p>
                      </div>
                    )}
                    
                    {ai_insight.recommended_action && (
                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                        <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Recommended Action</h4>
                        <p className="text-sm text-emerald-900 font-medium">{ai_insight.recommended_action}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: JOURNEY */}
      {activeTab === 'journey' && (
        <div className="animate-in zoom-in-95 duration-500 h-[800px] relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-4 border-white bg-slate-50 flex flex-col lg:flex-row">
          
          {/* Map Container */}
          <div className="flex-1 relative h-full">
            <OrgTreeFlow orgTree={orgTree} currentEvent={currentEvent} />
            
            {/* Floating Playback / Step Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 w-full max-w-lg px-4">
              <div className="bg-slate-900/80 backdrop-blur-md text-white/90 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                Timeline Scrubber &bull; Step {stepIndex + 1} of {events.length}
              </div>
              
              <div className="flex items-center justify-between w-full bg-white/90 backdrop-blur-2xl px-4 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/80">
                <button 
                  onClick={prevStep} 
                  disabled={stepIndex <= 0} 
                  className="w-10 h-10 flex shrink-0 items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 rounded-full transition-all border border-slate-200 hover:border-sky-200 shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center justify-center gap-2 flex-1 px-2 overflow-x-auto custom-scrollbar">
                  {events.map((_, i) => (
                    <div 
                      key={i} 
                      onClick={() => setStepIndex(i)}
                      className={cn(
                        "shrink-0 rounded-full transition-all cursor-pointer hover:scale-150 duration-300",
                        i === stepIndex ? "w-3 h-3 bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.6)]" : 
                        i < stepIndex ? "w-2.5 h-2.5 bg-slate-400 hover:bg-slate-500" : "w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300"
                      )}
                    />
                  ))}
                </div>
                
                <button 
                  onClick={nextStep} 
                  disabled={stepIndex >= events.length - 1} 
                  className="w-10 h-10 flex shrink-0 items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 rounded-full transition-all border border-slate-200 hover:border-sky-200 shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Docked Event Details Panel */}
          {currentEvent && (
            <div className="w-full lg:w-[400px] bg-white border-l border-slate-200 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] p-7 relative overflow-y-auto custom-scrollbar shrink-0">
              <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none">
                <FileText className="w-48 h-48" />
              </div>
              
              <h3 className="font-black text-slate-900 mb-6 uppercase tracking-widest border-b border-slate-200/50 pb-4 flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </div>
                Live Step Details
              </h3>
              
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Action Type</div>
                  <Badge variant="info" className="text-xs px-3 py-1 bg-white text-sky-700 shadow-sm border-sky-100">{currentEvent.action}</Badge>
                </div>
                
                <div>
                  <div className="text-slate-400 mb-2 text-[10px] uppercase font-black tracking-widest">Movement Trajectory</div>
                  <div className="text-slate-800 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="font-bold text-slate-900 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><User className="w-5 h-5"/></div>
                      <div className="text-lg">{currentEvent.from_user_name}</div>
                    </div>
                    {currentEvent.is_transfer && (
                      <>
                        <div className="w-1 h-6 bg-gradient-to-b from-slate-200 to-sky-200 ml-5 my-1" />
                        <div className="font-bold text-sky-700 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 border border-sky-100"><User className="w-5 h-5"/></div>
                          <div className="text-lg">{currentEvent.to_user_name}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {currentEvent.note_text && (
                  <div>
                    <div className="text-slate-400 mb-2 text-[10px] uppercase font-black tracking-widest">Attached Note</div>
                    <div className="text-slate-700 font-medium italic bg-sky-50 p-5 rounded-2xl border border-sky-100 relative overflow-hidden">
                      <div className="absolute -top-4 -left-2 text-sky-200/40 text-8xl font-serif">"</div>
                      <span className="relative z-10 block text-[15px]">{currentEvent.note_text}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-sky-500" /> {new Date(currentEvent.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-sky-500" /> {new Date(currentEvent.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
