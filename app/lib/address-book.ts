import { AddressBookEntry } from "../types";
import { LS_ADDRESSBOOK } from "../constants";

function load(): AddressBookEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_ADDRESSBOOK) ?? "[]"); }
  catch { return []; }
}
function persist(items: AddressBookEntry[]) {
  localStorage.setItem(LS_ADDRESSBOOK, JSON.stringify(items));
}

export const getAll    = (): AddressBookEntry[] => load().sort((a, b) => a.name.localeCompare(b.name));
export const addEntry  = (e: AddressBookEntry)  => persist([...load().filter(x => x.wallet !== e.wallet), e]);
export const removeEntry = (wallet: string)     => persist(load().filter(e => e.wallet !== wallet));
export const exportJson  = ()                   => JSON.stringify(load(), null, 2);
export const importJson  = (json: string)       => persist(JSON.parse(json) as AddressBookEntry[]);
