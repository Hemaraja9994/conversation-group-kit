/* Conversation Group Kit: eight ready-to-run session plans and an attendance register for a
   volunteer-led group. Plans print; the register exports to CSV. On-device. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Printer, UserPlus, Users } from "lucide-react";
import { AppShell, type Section } from "@/shell/AppShell";
import { Button, Empty, Field, Input, Panel, Select, cx } from "@/shell/ui";
import { References } from "@/shell/References";
import { usePersistent } from "@/shell/storage";
import { toast } from "@/shell/toast";
import { downloadCSV, esc, printHTML, todayISO, uid } from "@/shell/lib";
import { SESSIONS, attKey, attendedCount, type GroupData } from "./sessions";
import refs from "./refs.json";

const NEEDS = ["Aphasia", "Hearing loss", "Both", "Carer / family", "Volunteer"];

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState("plan");
  const [cur, setCur] = useState(0);
  const [data, setData] = usePersistent<GroupData>("cgk-data", { members: [], att: {} });
  const [mCode, setMCode] = useState("");
  const [mNeed, setMNeed] = useState(NEEDS[0]);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const sections: Section[] = [{ id: "plan", label: "Session plans", icon: CalendarDays }, { id: "register", label: "Register", icon: Users }];
  const go = (id: string) => { setView(id); window.scrollTo({ top: 0 }); };
  const s = SESSIONS[cur];

  const addMember = () => {
    const c = mCode.trim(); if (!c) { toast("Enter a member code."); return; }
    setData(d => ({ ...d, members: [...d.members, { id: uid(), code: c, need: mNeed }] }));
    setMCode(""); toast("Member added");
  };
  const toggleAtt = (memberId: string, i: number, on: boolean) => setData(d => {
    const att = { ...d.att }; if (on) att[attKey(memberId, i)] = true; else delete att[attKey(memberId, i)];
    return { ...d, att };
  });
  const removeMember = (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); return; }
    setData(d => ({ members: d.members.filter(m => m.id !== id), att: Object.fromEntries(Object.entries(d.att).filter(([k]) => !k.startsWith(id + "|"))) }));
    setConfirmDel(null); toast("Member removed");
  };

  const printPlan = () => printHTML(`<h2>Session ${cur + 1}: ${esc(s.t)}</h2>
    <h3>Warm-up (10 minutes)</h3><p>${esc(s.warm)}</p><h3>Main conversation (35 minutes)</h3><p>${esc(s.main)}</p>
    <h3>Bring</h3><p>${esc(s.bring)}</p><h3>Tip</h3><p>${esc(s.tip)}</p><h3>Notes</h3><div style="height:140pt;border:1px solid #777"></div>`);
  const printReg = () => printHTML(`<h2>Conversation group register</h2><table><tr><th>Member</th>${SESSIONS.map((_, i) => `<th>${i + 1}</th>`).join("")}</tr>${data.members.map(m => `<tr><td>${esc(m.code)}</td>${SESSIONS.map((_, i) => `<td style="text-align:center">${data.att[attKey(m.id, i)] ? "✓" : ""}</td>`).join("")}</tr>`).join("")}</table>`);
  const csv = () => downloadCSV([["member", "need", ...SESSIONS.map((x, i) => `S${i + 1} ${x.t}`), "total"],
    ...data.members.map(m => [m.code, m.need, ...SESSIONS.map((_, i) => data.att[attKey(m.id, i)] ? "present" : ""), attendedCount(data, m.id)])], `conversation-group-register-${todayISO()}.csv`);

  return (
    <AppShell title={t("appName")} subtitle={t("appSub")} sections={sections} active={view} onSection={go}
      footer={<p className="m-0">{t("disclaimer")}</p>}>

      {view === "plan" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <Panel title="Eight sessions">
            <ol className="m-0 grid list-none gap-2 p-0">
              {SESSIONS.map((x, i) => (
                <li key={i}>
                  <button type="button" onClick={() => setCur(i)} aria-current={i === cur ? "true" : undefined}
                    className={cx("flex min-h-11 w-full items-center gap-3 rounded-md border px-3 text-left text-[0.95rem]", i === cur ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:bg-surface")}>
                    <span className={cx("flex h-6 w-6 flex-none items-center justify-center rounded-full text-sm font-bold", i === cur ? "bg-paper text-ink" : "bg-track")}>{i + 1}</span>
                    <span className="min-w-0">{x.t}</span></button>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={`Session ${cur + 1}: ${s.t}`} action={<Button size="sm" onClick={printPlan}><Printer className="h-4 w-4" aria-hidden />Print plan</Button>}>
            <p className="m-0 text-[0.88rem] text-muted">About 60 minutes: 10 welcome and warm-up, 35 main topic, 10 wrap-up and tea, 5 notes.</p>
            <div className="mt-3 grid gap-3">
              <div><h3 className="m-0 text-base font-bold">Warm-up</h3><p className="m-0 mt-0.5 text-[0.95rem]">{s.warm}</p></div>
              <div><h3 className="m-0 text-base font-bold">Main conversation</h3><p className="m-0 mt-0.5 text-[0.95rem]">{s.main}</p></div>
              <div><h3 className="m-0 text-base font-bold">Bring</h3><p className="m-0 mt-0.5 text-[0.95rem]">{s.bring}</p></div>
              <div className="rounded-r-md border-l-4 border-accent bg-accent/8 px-4 py-3"><h3 className="m-0 text-base font-bold">Tip for this session</h3><p className="m-0 mt-0.5 text-[0.95rem]">{s.tip}</p></div>
            </div>
          </Panel>
        </div>
      )}

      {view === "register" && (
        <div className="grid gap-5">
          <Panel title="Add a member">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Member code" className="mt-0">{id => <Input id={id} value={mCode} onChange={e => setMCode(e.target.value)} placeholder="e.g. M-04" />}</Field>
              <Field label="Reason for joining" className="mt-0">{id => <Select id={id} value={mNeed} onChange={e => setMNeed(e.target.value)}>{NEEDS.map(n => <option key={n}>{n}</option>)}</Select>}</Field>
              <Button variant="primary" onClick={addMember}><UserPlus className="h-4 w-4" aria-hidden />Add</Button>
            </div>
          </Panel>
          <Panel title={`Attendance register (${data.members.length})`} action={<div className="flex gap-2">
            <Button size="sm" onClick={printReg} disabled={!data.members.length}>Print</Button>
            <Button size="sm" onClick={csv} disabled={!data.members.length}>Download CSV</Button></div>}>
            {data.members.length === 0 ? <Empty>Add members to start the register.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[0.9rem]">
                  <thead><tr>
                    <th scope="col" className="border-b border-line px-2 py-2 text-left font-bold text-muted">Member</th>
                    {SESSIONS.map((x, i) => <th key={i} scope="col" title={x.t} className="border-b border-line px-1 py-2 text-center font-bold text-muted">{i + 1}</th>)}
                    <th scope="col" className="border-b border-line px-2 py-2 text-center font-bold text-muted">Total</th>
                    <th scope="col" className="border-b border-line px-2 py-2"></th>
                  </tr></thead>
                  <tbody>{data.members.map(m => (
                    <tr key={m.id}>
                      <td className="border-b border-line px-2 py-2"><b>{m.code}</b><br /><span className="text-[0.8rem] text-muted">{m.need}</span></td>
                      {SESSIONS.map((x, i) => <td key={i} className="border-b border-line px-1 py-1 text-center">
                        <input type="checkbox" className="h-6 w-6 accent-[var(--color-ink)]" checked={!!data.att[attKey(m.id, i)]} onChange={e => toggleAtt(m.id, i, e.target.checked)} aria-label={`${m.code} session ${i + 1}: ${x.t}`} /></td>)}
                      <td className="border-b border-line px-2 py-2 text-center font-bold tabular-nums">{attendedCount(data, m.id)}</td>
                      <td className="border-b border-line px-2 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removeMember(m.id)}>{confirmDel === m.id ? "Confirm" : "Remove"}</Button></td>
                    </tr>))}</tbody>
                </table>
              </div>
            )}
          </Panel>
          <References refs={refs} contextQuery="group conversation aphasia participation" contextLabel="Why these groups help" />
        </div>
      )}
    </AppShell>
  );
}
