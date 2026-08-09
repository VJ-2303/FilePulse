import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFileJourney } from '../api/client';
import { Badge } from '../components/ui';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Activity, User, FileText } from 'lucide-react';
import { cn } from '../utils/classNames';

const customStyles = `
  @keyframes transfer-x {
    0% { left: 0%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { left: 100%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  }
  @keyframes transfer-x-rtl {
    0% { left: 100%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { left: 0%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  }
  @keyframes transfer-y {
    0% { top: 0%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { top: 100%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  }
  @keyframes transfer-y-rtl {
    0% { top: 100%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { top: 0%; transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  }
  .animate-transfer-desktop {
    animation: transfer-x 2.5s infinite ease-in-out;
  }
  .animate-transfer-desktop-rtl {
    animation: transfer-x-rtl 2.5s infinite ease-in-out;
  }
  .animate-transfer-mobile {
    animation: transfer-y 2.5s infinite ease-in-out;
  }
  .animate-transfer-mobile-rtl {
    animation: transfer-y-rtl 2.5s infinite ease-in-out;
  }
`;

export default function FileJourneyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stepIndex, setStepIndex] = useState(-1);

  useEffect(() => {
    async function loadData() {
      try {
        const journey = await fetchFileJourney(id);
        setData(journey);
        if (journey.events && journey.events.length > 0) {
          setStepIndex(0); // Start from the FIRST slide
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Loading cinematic journey...</div>;
  if (!data) return <div className="p-8 text-rose-500">Failed to load journey.</div>;

  const { file, events } = data;
  const currentEvent = stepIndex >= 0 && stepIndex < events.length ? events[stepIndex] : null;

  const nextStep = () => setStepIndex(s => Math.min(events.length - 1, s + 1));
  const prevStep = () => setStepIndex(s => Math.max(0, s - 1));

  let leftUser = null;
  let rightUser = null;
  let transferDirection = 'ltr';

  if (currentEvent && currentEvent.is_transfer) {
    const firstInteraction = events.find(e => 
      e.is_transfer && 
      ((e.from_user_id === currentEvent.from_user_id && e.to_user_id === currentEvent.to_user_id) ||
       (e.from_user_id === currentEvent.to_user_id && e.to_user_id === currentEvent.from_user_id))
    );
    
    leftUser = { name: currentEvent.from_user_name, role: 'Sender' };
    rightUser = { name: currentEvent.to_user_name, role: 'Receiver' };

    if (firstInteraction && firstInteraction.from_user_id === currentEvent.to_user_id) {
      leftUser = { name: currentEvent.to_user_name, role: 'Receiver' };
      rightUser = { name: currentEvent.from_user_name, role: 'Sender' };
      transferDirection = 'rtl';
    }
  }

  if (!currentEvent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No journey events found for this file.
        <button onClick={() => navigate(-1)} className="mt-4 block mx-auto text-sky-500 underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 min-h-[calc(100vh-100px)] flex flex-col">
      <style>{customStyles}</style>
      {/* Header Section */}
      <div className="flex items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white border border-transparent hover:border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">{file.title}</h1>
            <div className="text-slate-400 text-sm mt-1">Cinematic Journey Mode</div>
          </div>
        </div>
      </div>

      {/* Cinematic View */}
      <div className="bg-slate-900 rounded-3xl p-4 lg:p-8 flex-1 flex flex-col relative overflow-hidden shadow-2xl border border-slate-800">

        {/* Background Ambient Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

        {/* HUGE FLOATING NAVIGATION BUTTONS */}
        <button
          onClick={prevStep}
          disabled={stepIndex <= 0}
          className="absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 z-20 w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/80 backdrop-blur-md border border-slate-600/50 text-white disabled:opacity-0 transition-all shadow-2xl"
        >
          <ChevronLeft className="w-8 h-8 lg:w-10 lg:h-10" />
        </button>

        <button
          onClick={nextStep}
          disabled={stepIndex >= events.length - 1}
          className="absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 z-20 w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/80 backdrop-blur-md border border-slate-600/50 text-white disabled:opacity-0 transition-all shadow-2xl"
        >
          <ChevronRight className="w-8 h-8 lg:w-10 lg:h-10" />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto px-12 lg:px-24">

          {/* The Main Slide */}
          <div className="w-full flex flex-col items-center gap-6 lg:gap-8 mt-4 lg:mt-0">

            <div className="text-center space-y-2">
              <Badge variant="info" className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-4 py-1.5 text-sm tracking-widest uppercase shadow-sm">
                Step {stepIndex + 1} of {events.length}
              </Badge>
              <div className="text-slate-300 font-medium flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                {new Date(currentEvent.timestamp).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
              </div>
            </div>

            {/* Transaction Visual */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 w-full mt-4">

              {/* Sender / Left User */}
              <div className="flex flex-col items-center gap-4 shrink-0">
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center shadow-lg relative">
                  <User className="w-10 h-10 lg:w-12 lg:h-12 text-slate-400" />
                  {!currentEvent.is_transfer && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-emerald-500 border-4 border-slate-900 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg lg:text-xl">
                    {currentEvent.is_transfer ? leftUser.name : currentEvent.from_user_name}
                  </div>
                  <div className="text-slate-300 text-base font-semibold">
                    {currentEvent.is_transfer ? leftUser.role : 'Actor'}
                  </div>
                </div>
              </div>

              {/* Connection Line */}
              {currentEvent.is_transfer && (
                <div className="flex-1 flex flex-col items-center relative w-full lg:w-auto py-8 lg:py-0">
                  <div className="w-1 h-24 lg:w-full lg:h-1 bg-slate-700 rounded-full relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 lg:inset-y-0 lg:left-0 bg-sky-500 h-full lg:h-auto lg:w-full" style={{ opacity: 0.8 }} />
                  </div>

                  {/* Traveling Document Icon */}
                  <div className={cn("hidden lg:flex absolute top-1/2 left-0 z-0 pointer-events-none items-center gap-1.5", transferDirection === 'rtl' ? 'animate-transfer-desktop-rtl flex-row-reverse' : 'animate-transfer-desktop')}>
                    <FileText className="w-6 h-6 text-slate-300 drop-shadow-md" />
                    <div className="text-sky-400 font-bold">{transferDirection === 'rtl' ? '←' : '→'}</div>
                  </div>
                  <div className={cn("lg:hidden absolute top-0 left-1/2 z-0 pointer-events-none flex flex-col items-center gap-1.5", transferDirection === 'rtl' ? 'animate-transfer-mobile-rtl flex-col-reverse' : 'animate-transfer-mobile')}>
                    <FileText className="w-6 h-6 text-slate-300 drop-shadow-md" />
                    <div className="text-sky-400 font-bold -rotate-90">{transferDirection === 'rtl' ? '←' : '→'}</div>
                  </div>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-sky-500 text-sky-400 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(14,165,233,0.4)] whitespace-nowrap z-10">
                    {currentEvent.action}
                  </div>
                </div>
              )}

              {/* Receiver / Right User (Only if transfer) */}
              {currentEvent.is_transfer && (
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-slate-800 border-2 border-sky-500 flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.2)]">
                    <User className="w-10 h-10 lg:w-12 lg:h-12 text-sky-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-lg lg:text-xl">{rightUser.name}</div>
                    <div className="text-sky-300 text-base font-semibold">{rightUser.role}</div>
                  </div>
                </div>
              )}

              {/* Non-transfer action badge */}
              {!currentEvent.is_transfer && (
                <div className="flex-1 flex justify-center lg:justify-start lg:pl-8 mt-4 lg:mt-0">
                  <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 px-8 py-5 rounded-2xl flex items-center gap-5 shadow-xl">
                    <Activity className="w-8 h-8 text-sky-400" />
                    <div>
                      <div className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1.5">Action Performed</div>
                      <div className="text-white font-bold text-xl">{currentEvent.action}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Note Section */}
            {currentEvent.note_text && (
              <div className="w-full max-w-3xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 lg:p-10 rounded-3xl relative mt-4">
                <div className="absolute -top-8 -left-4 text-slate-600/50 text-9xl font-serif leading-none">"</div>
                <div className="relative z-10 text-slate-200 text-lg lg:text-xl font-medium leading-relaxed text-center">
                  {currentEvent.note_text}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Timeline Scrubber */}
        <div className="mt-6 lg:mt-8 relative z-10 max-w-5xl mx-auto w-full shrink-0">
          <div className="flex items-center justify-between gap-4 lg:gap-8 w-full bg-slate-800/30 p-4 lg:px-6 lg:pt-5 lg:pb-10 rounded-3xl border border-slate-700/30 backdrop-blur-md">
            <button
              onClick={prevStep}
              disabled={stepIndex <= 0}
              className="w-12 h-12 flex shrink-0 items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all border border-slate-600 shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex-1 flex items-center justify-between relative px-2 lg:px-6">
              {/* Background track line */}
              <div className="absolute left-6 right-6 h-1.5 bg-slate-800 rounded-full top-1/2 -translate-y-1/2 z-0" />

              {/* Progress line */}
              <div
                className="absolute left-6 h-1.5 bg-sky-500 rounded-full top-1/2 -translate-y-1/2 z-0 transition-all duration-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                style={{ width: `calc(${events.length > 1 ? (stepIndex / (events.length - 1)) * 100 : 0}% - 3rem)` }}
              />

              {events.map((evt, i) => (
                <div
                  key={i}
                  onClick={() => setStepIndex(i)}
                  className="relative z-10 flex flex-col items-center gap-3 cursor-pointer group"
                >
                  <div className={cn(
                    "w-4 h-4 lg:w-5 lg:h-5 rounded-full transition-all duration-300 border-2 lg:border-[3px]",
                    i === stepIndex ? "bg-sky-500 border-sky-300 scale-125 lg:scale-150 shadow-[0_0_20px_rgba(14,165,233,0.8)]" :
                      i < stepIndex ? "bg-sky-500 border-sky-400" : "bg-slate-800 border-slate-500 group-hover:border-slate-400 group-hover:bg-slate-700"
                  )} />
                  <div className={cn(
                    "absolute top-8 lg:top-7 whitespace-nowrap text-[10px] lg:text-[11px] font-bold uppercase tracking-widest transition-colors",
                    i === stepIndex ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300 opacity-0 lg:opacity-100"
                  )}>
                    {new Date(evt.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={nextStep}
              disabled={stepIndex >= events.length - 1}
              className="w-12 h-12 flex shrink-0 items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all border border-slate-600 shadow-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
