import { PayrollSchedule } from "../types";
import { Cadence, LS_SCHEDULES } from "../constants";

function load(): PayrollSchedule[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_SCHEDULES) ?? "[]"); }
  catch { return []; }
}
function persist(items: PayrollSchedule[]) {
  localStorage.setItem(LS_SCHEDULES, JSON.stringify(items));
}

export function nextRunDate(cadence: Cadence, from = Date.now()): number {
  const d = new Date(from);
  if (cadence === "weekly")   d.setDate(d.getDate() + 7);
  if (cadence === "biweekly") d.setDate(d.getDate() + 14);
  if (cadence === "monthly")  d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

export function formatCountdown(nextRunAt: number): string {
  const diff = Math.max(0, nextRunAt - Date.now());
  const d    = Math.floor(diff / 86_400_000);
  const h    = Math.floor((diff % 86_400_000) / 3_600_000);
  const m    = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const isDue        = (s: PayrollSchedule) => s.enabled && Date.now() >= s.nextRunAt;
export const getSchedules = (): PayrollSchedule[] => load();
export const saveSchedule = (s: PayrollSchedule)  => persist([...load().filter(x => x.id !== s.id), s]);
export const deleteSchedule = (id: string)        => persist(load().filter(x => x.id !== id));
export const advanceSchedule = (id: string)       =>
  persist(load().map(s => {
    if (s.id !== id) return s;
    return { ...s, nextRunAt: nextRunDate(s.cadence, Date.now()) };
  }));
