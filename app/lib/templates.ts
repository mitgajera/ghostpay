import { PayrollTemplate } from "../types";
import { LS_TEMPLATES } from "../constants";

function load(): PayrollTemplate[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_TEMPLATES) ?? "[]"); }
  catch { return []; }
}
function persist(items: PayrollTemplate[]) {
  localStorage.setItem(LS_TEMPLATES, JSON.stringify(items));
}

export const getTemplates    = (): PayrollTemplate[] => load();
export const saveTemplate    = (t: PayrollTemplate)  => persist([...load().filter(x => x.id !== t.id), t]);
export const deleteTemplate  = (id: string)          => persist(load().filter(x => x.id !== id));
export const markUsed        = (id: string)          =>
  persist(load().map(t => t.id === id ? { ...t, lastUsedAt: Date.now() } : t));
