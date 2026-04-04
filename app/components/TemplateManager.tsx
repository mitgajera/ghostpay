import { useState, useEffect } from "react";
import { PayrollTemplate } from "../types";
import { Recipient } from "../types";
import { getTemplates, saveTemplate, deleteTemplate, markUsed } from "../lib/templates";

interface Props {
  currentRecipients: Recipient[];
  onLoad: (recipients: Recipient[]) => void;
  onToast: (level: "ok" | "error" | "info", msg: string) => void;
}

export default function TemplateManager({ currentRecipients, onLoad, onToast }: Props) {
  const [templates, setTemplates]   = useState<PayrollTemplate[]>([]);
  const [saveName,  setSaveName]    = useState("");
  const [saving,    setSaving]      = useState(false);

  function refresh() { setTemplates(getTemplates()); }
  useEffect(refresh, []);

  function handleSave() {
    if (!saveName.trim()) return;
    if (currentRecipients.length === 0) { onToast("error", "Add recipients before saving a template"); return; }
    const t: PayrollTemplate = {
      id:         crypto.randomUUID(),
      name:       saveName.trim(),
      recipients: currentRecipients,
      createdAt:  Date.now(),
    };
    saveTemplate(t);
    setSaveName("");
    setSaving(false);
    refresh();
    onToast("ok", `Template "${t.name}" saved`);
  }

  function handleLoad(t: PayrollTemplate) {
    markUsed(t.id);
    onLoad(t.recipients);
    refresh();
    onToast("ok", `Loaded "${t.name}" — ${t.recipients.length} recipient(s)`);
  }

  function handleDelete(id: string, name: string) {
    deleteTemplate(id);
    refresh();
    onToast("info", `Template "${name}" deleted`);
  }

  const totalUsdc = (recs: Recipient[]) => recs.reduce((s, r) => s + r.amountUsdc, 0);

  return (
    <div className="flex flex-col gap-5">

      {/* Save current payroll as template */}
      <div className="bg-gp-surface-2 border border-gp-border-2 rounded-xl p-4 flex flex-col gap-3">
        <p className="gp-label">Save current payroll as template</p>
        {saving ? (
          <div className="flex gap-2">
            <input
              className="gp-input flex-1"
              placeholder="e.g. Monthly Core Team"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <button onClick={handleSave} className="font-display font-semibold text-xs bg-gp-green text-gp-white px-4 py-2 rounded-lg hover:opacity-90">
              Save
            </button>
            <button onClick={() => setSaving(false)} className="font-mono text-xs text-gp-border-3 hover:text-gp-ghost-dim px-2">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSaving(true)}
            disabled={currentRecipients.length === 0}
            className="self-start font-mono text-xs text-gp-ghost-dim border border-gp-border-2 hover:border-gp-border-3 px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
          >
            + Save as template
            {currentRecipients.length > 0 && <span className="text-gp-border-3 ml-1.5">({currentRecipients.length} recipients)</span>}
          </button>
        )}
      </div>

      {/* Saved templates */}
      {templates.length === 0 ? (
        <p className="font-mono text-xs text-gp-border-3 text-center py-8">
          No templates saved yet. Run a payroll and save it as a template to reuse it.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt)).map((t) => (
            <div key={t.id} className="gp-card px-5 py-4 flex items-center justify-between gap-4 hover:border-gp-border-2 transition-colors">
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-gp-ghost truncate">{t.name}</p>
                <p className="font-mono text-xs text-gp-ghost-dim/60 mt-0.5">
                  {t.recipients.length} recipient{t.recipients.length !== 1 ? "s" : ""} ·{" "}
                  {(totalUsdc(t.recipients) / 1_000_000).toFixed(2)} USDC
                  {t.lastUsedAt && <span className="ml-2">· last used {fmtDate(t.lastUsedAt)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleLoad(t)}
                  className="font-display font-semibold text-xs bg-gp-green text-gp-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  className="font-mono text-xs text-gp-border-3 hover:text-red-400/70 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
