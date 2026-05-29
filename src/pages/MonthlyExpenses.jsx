import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const CATEGORY_COLORS = {
  travel: "#f97316", accommodation: "#3b82f6", food: "#22c55e",
  equipment: "#a855f7", venue: "#ec4899", marketing: "#14b8a6",
  labor: "#eab308", other: "#94a3b8",
};

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

export default function MonthlyExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));

  useEffect(() => {
    async function load() {
      const [exp, evts] = await Promise.all([
        base44.entities.Expense.list("-created_date", 1000),
        base44.entities.Event.list("-start_date", 200),
      ]);
      setExpenses(exp);
      setEvents(evts);
      setLoading(false);
    }
    load();
  }, []);

  // Build a map of eventId -> event for budget lookups
  const eventMap = useMemo(() => {
    const m = {};
    events.forEach((e) => { m[e.id] = e; });
    return m;
  }, [events]);

  // Group expenses by month using created_date
  const byMonth = useMemo(() => {
    const map = {};
    expenses.forEach((exp) => {
      const key = getMonthKey(exp.created_date);
      if (!map[key]) map[key] = [];
      map[key].push(exp);
    });
    return map;
  }, [expenses]);

  // All months that have data, plus current month and next 3 for projections
  const allMonths = useMemo(() => {
    const keys = new Set(Object.keys(byMonth));
    const now = new Date();
    for (let i = 0; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      keys.add(getMonthKey(d));
    }
    return Array.from(keys).sort();
  }, [byMonth]);

  const currentIdx = allMonths.indexOf(selectedMonth);
  const nowKey = getMonthKey(new Date());

  // Projection: average of last 3 months
  const projection = useMemo(() => {
    const pastMonths = allMonths.filter((k) => k < nowKey).slice(-3);
    if (pastMonths.length === 0) return 0;
    const total = pastMonths.reduce((sum, k) => {
      return sum + (byMonth[k] || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, 0);
    return total / pastMonths.length;
  }, [byMonth, allMonths, nowKey]);

  const selectedItems = byMonth[selectedMonth] || [];
  const isFuture = selectedMonth > nowKey;

  // Category breakdown for selected month
  const categoryTotals = useMemo(() => {
    const cats = {};
    selectedItems.forEach((exp) => {
      const cat = exp.category || "other";
      cats[cat] = (cats[cat] || 0) + (Number(exp.amount) || 0);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [selectedItems]);

  // Total budgets for events with expenses this month
  const eventIds = useMemo(() => [...new Set(selectedItems.map((e) => e.event_id))], [selectedItems]);
  const totalBudget = eventIds.reduce((sum, id) => sum + (Number(eventMap[id]?.budget) || 0), 0);
  const totalSpent = selectedItems.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Chart data: last 6 months + next 3 projected
  const chartData = useMemo(() => {
    const start = allMonths[Math.max(0, allMonths.indexOf(nowKey) - 5)];
    const end = allMonths[Math.min(allMonths.length - 1, allMonths.indexOf(nowKey) + 3)];
    return allMonths
      .filter((k) => k >= start && k <= end)
      .map((k) => {
        const future = k > nowKey;
        const spent = (byMonth[k] || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return {
          month: new Date(Number(k.split("-")[0]), Number(k.split("-")[1]) - 1, 1)
            .toLocaleString("default", { month: "short" }),
          key: k,
          amount: future ? projection : spent,
          projected: future,
        };
      });
  }, [allMonths, byMonth, nowKey, projection]);

  // Per-event breakdown for selected month
  const perEvent = useMemo(() => {
    const map = {};
    selectedItems.forEach((exp) => {
      if (!map[exp.event_id]) map[exp.event_id] = { name: eventMap[exp.event_id]?.name || "Unknown Event", total: 0, items: [] };
      map[exp.event_id].total += Number(exp.amount) || 0;
      map[exp.event_id].items.push(exp);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [selectedItems, eventMap]);

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Monthly Expenses</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track expenses across all events by month</p>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(allMonths[Math.max(0, currentIdx - 1)])} disabled={currentIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold min-w-48 text-center">{monthLabel(selectedMonth)}</h2>
          {isFuture && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Projection</span>}
          {selectedMonth === nowKey && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Current Month</span>}
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(allMonths[Math.min(allMonths.length - 1, currentIdx + 1)])} disabled={currentIdx === allMonths.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{isFuture ? "Projected Spend" : "Total Spent"}</p>
          </div>
          <p className="text-xl font-bold">${fmt(isFuture ? projection : totalSpent)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Events with Expenses</p>
          </div>
          <p className="text-xl font-bold">{isFuture ? "—" : eventIds.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Combined Budget</p>
          </div>
          <p className="text-xl font-bold">{totalBudget > 0 ? `$${fmt(totalBudget)}` : "—"}</p>
        </div>
        <div className={`rounded-xl p-4 border ${!isFuture && totalBudget > 0 ? (totalSpent <= totalBudget ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700" : "bg-destructive/10 border-destructive/20") : "bg-card border-border"}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Net vs Budget</p>
          </div>
          <p className={`text-xl font-bold ${!isFuture && totalBudget > 0 ? (totalSpent <= totalBudget ? "text-emerald-600 dark:text-emerald-400" : "text-destructive") : ""}`}>
            {!isFuture && totalBudget > 0 ? `${totalSpent <= totalBudget ? "+" : "-"}$${fmt(Math.abs(totalBudget - totalSpent))}` : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Spending Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
            <Tooltip formatter={(v, _, props) => [`$${fmt(v)}`, props.payload.projected ? "Projected" : "Spent"]} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} onClick={(d) => setSelectedMonth(d.key)}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.key === selectedMonth ? "hsl(var(--primary))" : entry.projected ? "hsl(var(--muted-foreground))" : "hsl(var(--chart-1))"}
                  opacity={entry.projected ? 0.5 : 1}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">Faded bars are projections based on 3-month average · Click a bar to jump to that month</p>
      </div>

      {/* Bottom Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">By Category</h3>
          {isFuture ? (
            <p className="text-sm text-muted-foreground">Projection based on historical average — no category breakdown available.</p>
          ) : categoryTotals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded.</p>
          ) : (
            <div className="space-y-3">
              {categoryTotals.map(([cat, amount]) => {
                const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{cat}</span>
                      <span className="text-muted-foreground">${fmt(amount)} <span className="text-xs">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-Event Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">By Event</h3>
          {isFuture ? (
            <p className="text-sm text-muted-foreground">No per-event breakdown available for projected months.</p>
          ) : perEvent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded.</p>
          ) : (
            <div className="space-y-3">
              {perEvent.map((ev) => (
                <div key={ev.name} className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ev.name}</p>
                    <p className="text-xs text-muted-foreground">{ev.items.length} expense{ev.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">${fmt(ev.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}