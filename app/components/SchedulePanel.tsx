import { useState, useEffect } from "react";
import { PayrollSchedule, PayrollTemplate } from "../types";
import { Cadence, CADENCES } from "../constants";
import { getTemplates } from "../lib/templates";
import { getSchedules, saveSchedule, deleteSchedule, nextRunDate, formatCountdown, isDue } from "../lib/schedule";

interface Props {
  onToast: (level: "ok" | "error" | "info", msg: string) => void;
}

export default function SchedulePanel({ onToast }: Props) {
  const [templates,  setTemplates]  = useState<PayrollTemplate[]>([]);
  const [schedules,  setSchedules]  = useState<PayrollSchedule[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [cadence,    setCadence]    = useState<Cadence>("monthly");

  function refresh() {
    setTemplates(getTemplates());
    setSchedules(getSchedules());
  }
  useEffect(refresh, []);
  // Tick every minute to update countdowns
  useEffect(() => {
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  function handleCreate() {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) { onToast("error", "Select a template first"); return; }
    const s: PayrollSchedule = {
      id:           crypto.randomUUID(),
      templateId:   tmpl.id,
      templateName: tmpl.name,
      cadence,
      nextRunAt:    nextRunDate(cadence),
      enabled:      true,
      createdAt:    Date.now(),
    };
    saveSchedule(s);
    refresh();
    onToast("ok", `Scheduled "${tmpl.name}" — ${cadence}`);
  }

  function handleToggle(s: PayrollSchedule) {
    saveSchedule({ ...s, enabled: !s.enabled });
    refresh();
  }

  function handleDelete(id: string) {
    deleteSchedule(id);
    refresh();
    onToast("info", "Schedule removed");
  }

  const due = schedules.filter(isDue);

  return (
    <div className="flex flex-col gap-5">
      {/* Due banner */}
      {due.map((s) => (
        <div key={s.id} className="bg-gp-green/10 border border-gp-green/30 rounded-xl px-5 py-4 flex items-center justify-between animate-slide-up">
          <div>
            <p className="font-display font-semibold text-sm text-gp-green">Payroll due now</p>
            <p className="font-mono text-xs text-gp-green/70 mt-0.5">"{s.templateName}" · {s.cadence}</p>
          </div>
          <span className="font-mono text-[10px] text-gp-green/60 border border-gp-green/20 rounded px-2 py-1 uppercase tracking-widest">
            Due
          </span>
        </div>
      ))}

      {/* Create new schedule */}
      {templates.length === 0 ? (
        <div className="gp-card px-5 py-6 text-center">
          <p className="font-mono text-xs text-gp-border-3">Save a template first to schedule recurring payroll.</p>
        </div>
      ) : (
        <div className="gp-card px-5 py-5 flex flex-col gap-4">
          <p className="gp-section-title">New schedule</p>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="gp-label">Template</label>
              <select className="gp-input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="gp-label">Cadence</label>
              <select className="gp-input" value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
                {CADENCES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={!templateId}
              className="font-display font-semibold text-xs bg-gp-green text-gp-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-30 h-[34px]"
            >
              Schedule
            </button>
          </div>
        </div>
      )}

      {/* Existing schedules */}
      {schedules.length === 0 ? (
        <p className="font-mono text-xs text-gp-border-3 text-center py-6">No schedules yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {schedules.map((s) => (
            <div key={s.id} className="gp-card px-5 py-4 flex items-center justify-between hover:border-gp-border-2 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.enabled ? "bg-gp-green animate-pulse-dot" : "bg-gp-border-3"}`} />
                  <span className="font-display font-semibold text-sm text-gp-ghost">{s.templateName}</span>
                  <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-widest">{s.cadence}</span>
                </div>
                <p className="font-mono text-[10px] text-gp-ghost-dim/50 mt-1 ml-3.5">
                  {isDue(s)
                    ? <span className="text-gp-green">Due now</span>
                    : <>Next run in {formatCountdown(s.nextRunAt)} · {new Date(s.nextRunAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(s)}
                  className={`font-mono text-[10px] border px-3 py-1.5 rounded-lg transition-colors ${
                    s.enabled
                      ? "border-gp-border-2 text-gp-ghost-dim hover:border-gp-border-3"
                      : "border-gp-green/30 text-gp-green hover:border-gp-green/60"
                  }`}
                >
                  {s.enabled ? "Pause" : "Resume"}
                </button>
                <button onClick={() => handleDelete(s.id)} className="font-mono text-[10px] text-gp-border-3 hover:text-red-400/70 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
