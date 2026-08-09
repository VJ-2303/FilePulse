import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchAssistantResponse } from '../api/client';
import { MessageCircle, X, Send, Sparkles, ChevronRight } from 'lucide-react';

const QUICK_PROMPTS = [
  { label: 'Office Overview', text: 'Give me an overview of the office status today' },
  { label: 'Top Risk Files', text: 'Which files have the highest risk scores?' },
  { label: 'Overdue Files', text: 'Which files are overdue and past their deadline?' },
  { label: 'Looping Departments', text: 'Which departments are looping files back and forth?' },
];

const INTENT_LABELS = {
  FILE_DETAIL: '📄 File',
  EMPLOYEE_DETAIL: '👤 Employee',
  ALERT_SUMMARY: '🔴 Alerts',
  OVERDUE_FILES: '⏰ Overdue',
  DEPARTMENT_LOOPS: '🔁 Loops',
  DASHBOARD_SUMMARY: '📊 Overview',
  UNKNOWN: '💬 General',
};

export default function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm the FilePulse Assistant. I can help you understand file statuses, employee workloads, risk alerts, and department bottlenecks. What would you like to know?",
      intent: null,
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const location = useLocation();

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const send = async (text) => {
    const message = text || input.trim();
    if (!message || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setLoading(true);

    let active_file_id = null;
    let active_employee_id = null;

    if (location.pathname.startsWith('/files/')) {
      active_file_id = location.pathname.split('/')[2];
    } else if (location.pathname.startsWith('/employees/')) {
      active_employee_id = location.pathname.split('/')[2];
    }

    try {
      const data = await fetchAssistantResponse(message, active_file_id, active_employee_id);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          intent: data.intent,
          sources: data.sources || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I could not connect to the AI engine. Please make sure the backend server is running.',
          intent: null,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 bg-sky-600 text-white hover:bg-sky-700 hover:scale-110"
          title="FilePulse Assistant"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full z-40 flex flex-col bg-white border-l border-slate-200 shadow-2xl transition-all duration-300 ease-in-out ${
          isOpen ? 'w-[420px] translate-x-0' : 'w-[420px] translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-800 shrink-0">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">FilePulse Assistant</h2>
            <p className="text-sky-100 text-xs">Powered by local Ollama AI</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="ml-auto p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick prompts (shown only if conversation is just the intro) */}
        {messages.length === 1 && (
          <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Questions</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.text)}
                  className="text-left text-xs font-medium px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 shrink-0" />
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-700 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-slate
                    prose-p:my-1 prose-p:leading-relaxed
                    prose-headings:font-bold prose-headings:text-slate-900 prose-headings:my-2
                    prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
                    prose-ul:my-1.5 prose-ul:pl-4 prose-ul:space-y-0.5
                    prose-ol:my-1.5 prose-ol:pl-4 prose-ol:space-y-0.5
                    prose-li:my-0 prose-li:leading-snug
                    prose-strong:font-bold prose-strong:text-slate-900
                    prose-em:italic prose-em:text-slate-600
                    prose-code:bg-slate-200 prose-code:text-sky-700 prose-code:font-mono prose-code:text-xs prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:text-xs prose-pre:p-3 prose-pre:my-2 prose-pre:overflow-x-auto
                    prose-blockquote:border-l-4 prose-blockquote:border-sky-400 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-slate-500 prose-blockquote:my-2
                    prose-table:text-xs prose-table:border-collapse prose-table:w-full prose-table:my-2
                    prose-th:bg-slate-200 prose-th:text-slate-700 prose-th:font-bold prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:border prose-th:border-slate-300
                    prose-td:px-2 prose-td:py-1 prose-td:border prose-td:border-slate-200 prose-td:align-top
                    prose-hr:border-slate-300 prose-hr:my-3
                    prose-a:text-sky-600 prose-a:underline
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Source chips */}
                {msg.role === 'assistant' && (msg.intent || msg.sources?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-200/70">
                    {msg.intent && INTENT_LABELS[msg.intent] && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full">
                        {INTENT_LABELS[msg.intent]}
                      </span>
                    )}
                    {msg.sources?.map((src) => (
                      <span key={src} className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}


          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about a file, employee, or alert..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 max-h-32"
              style={{ overflow: input.includes('\n') ? 'auto' : 'hidden' }}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
