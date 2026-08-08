import { cn } from "../../utils/classNames";

export function Badge({ children, variant = "default", className }) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    danger: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
    info: "bg-sky-100 text-sky-700"
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className, noPadding = false, ...props }) {
  return (
    <div 
      className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}
      {...props}
    >
      <div className={cn(!noPadding && "p-5")}>
        {children}
      </div>
    </div>
  );
}

export function Button({ children, variant = "primary", className, ...props }) {
  const base = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };
  
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
