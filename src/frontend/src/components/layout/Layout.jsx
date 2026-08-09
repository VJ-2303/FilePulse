import { Sidebar } from "./Sidebar";
import AssistantPanel from "../AssistantPanel";

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mx-auto max-w-[1440px]">
          {children}
        </div>
      </main>
      <AssistantPanel />
    </div>
  );
}

