interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-gp-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`
            relative flex items-center gap-1.5 px-4 py-3 font-mono text-xs transition-colors duration-150
            ${active === t.id
              ? "text-gp-ghost"
              : "text-gp-border-3 hover:text-gp-ghost-dim"
            }
          `}
        >
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="bg-gp-green/20 text-gp-green text-[9px] font-mono px-1.5 py-px rounded-full">
              {t.badge}
            </span>
          )}
          {active === t.id && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-gp-ghost" />
          )}
        </button>
      ))}
    </div>
  );
}
