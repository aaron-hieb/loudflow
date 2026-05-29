import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Receipt, Download, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Returns the most recent Monday on or before today
function getLastMonday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = (day === 0 ? 6 : day - 1); // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Given a date, return the start of its 2-week period relative to the anchor Monday
function getPeriodStart(date, anchor) {
  const diffMs = date - anchor;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    // Before anchor: go backwards in 2-week chunks
    const periods = Math.floor(Math.abs(diffDays) / 14);
    const d = new Date(anchor);
    d.setDate(d.getDate() - (periods + 1) * 14);
    return d;
  }
  const periods = Math.floor(diffDays / 14);
  const d = new Date(anchor);
  d.setDate(d.getDate() + periods * 14);
  return d;
}

function formatPeriodLabel(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

export default function AdminReceipts() {
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [reimbursements, eventsData] = await Promise.all([
        base44.entities.Reimbursement.filter({ status: "approved" }, "-created_date", 500),
        base44.entities.Event.list("-start_date", 500),
      ]);
      const eventMap = {};
      eventsData.forEach((e) => { eventMap[e.id] = e; });
      setEvents(eventMap);
      setItems(reimbursements);
      setLoading(false);
    }
    load();
  }, []);

  const anchor = getLastMonday();

  const filtered = items.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.reimbursement_to?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.submitted_by?.toLowerCase().includes(s) ||
      events[r.event_id]?.name?.toLowerCase().includes(s)
    );
  });

  // Group by 2-week period
  const grouped = {};
  filtered.forEach((r) => {
    const created = new Date(r.created_date);
    const periodStart = getPeriodStart(created, anchor);
    const key = periodStart.toISOString();
    if (!grouped[key]) grouped[key] = { label: formatPeriodLabel(periodStart), start: periodStart, items: [] };
    grouped[key].items.push(r);
  });

  const sortedPeriods = Object.values(grouped).sort((a, b) => b.start - a.start);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approved Receipts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All approved reimbursements grouped by 2-week pay period</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, event, description..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {sortedPeriods.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No approved reimbursements found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedPeriods.map((period) => {
            const total = period.items.reduce((sum, r) => sum + (r.amount || 0), 0);
            return (
              <div key={period.label}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-semibold">{period.label}</h2>
                    <p className="text-xs text-muted-foreground">{period.items.length} receipt{period.items.length !== 1 ? "s" : ""} · Total: <span className="font-semibold text-foreground">${total.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-2">
                  {period.items.map((r) => (
                    <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                      <Receipt className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{r.description || "Receipt"}</span>
                          {r.amount && (
                            <span className="text-sm font-semibold text-primary">${Number(r.amount).toFixed(2)}</span>
                          )}
                          {events[r.event_id] && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {events[r.event_id].name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reimburse to: <span className="font-medium text-foreground">{r.reimbursement_to}</span>
                          {r.submitted_by && <> · Submitted by {r.submitted_by}</>}
                        </p>
                        {r.notes && (
                          <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">{r.notes}</p>
                        )}
                      </div>
                      {r.receipt_url && (
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={r.receipt_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                              <ExternalLink className="h-3 w-3" /> View
                            </Button>
                          </a>
                          <a href={r.receipt_url} download>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                              <Download className="h-3 w-3" /> Download
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}