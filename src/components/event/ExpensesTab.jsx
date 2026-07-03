import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Plus, Trash2, Pencil } from "lucide-react";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const categories = ["travel", "accommodation", "food", "equipment", "venue", "marketing", "labor", "other"];

const defaultForm = { description: "", amount: "", category: "other", vendor: "", notes: "" };

export default function ExpensesTab({ eventId, budget }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, [eventId]);

  async function load() {
    const data = await base44.entities.Expense.filter({ event_id: eventId }, "-created_date");
    setItems(data);
    setLoading(false);
  }

  function openNew() {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setForm({
      description: item.description || "",
      amount: item.amount || "",
      category: item.category || "other",
      vendor: item.vendor || "",
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    setSaving(true);
    const payload = {
      event_id: eventId,
      description: form.description,
      category: form.category,
      vendor: form.vendor,
      notes: form.notes,
    };
    if (form.amount) payload.amount = Number(form.amount);

    if (editingId) {
      await base44.entities.Expense.update(editingId, payload);
    } else {
      await base44.entities.Expense.create(payload);
    }
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleDelete() {
    await base44.entities.Expense.delete(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const netEarnings = budget != null ? Number(budget) - total : null;

  const grouped = categories.reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Expenses</h3>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          )}
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {netEarnings != null && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="text-lg font-bold">${Number(budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-destructive">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className={`rounded-xl p-4 text-center border ${netEarnings >= 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-destructive/10 border-destructive/20"}`}>
            <p className="text-xs text-muted-foreground mb-1">Net Earnings</p>
            <p className={`text-lg font-bold ${netEarnings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {netEarnings < 0 ? "-" : ""}${Math.abs(netEarnings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No expenses recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold capitalize text-muted-foreground">{cat}</h4>
                <span className="text-xs text-muted-foreground">
                  ${catItems.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.description || "—"}</p>
                      {item.vendor && <p className="text-xs text-muted-foreground mt-0.5">{item.vendor}</p>}
                      {item.notes && <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.amount != null && (
                        <span className="text-sm font-semibold text-primary">${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Expense?"
        itemName={deleteTarget?.description}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Sound system rental" />
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Vendor</Label>
                <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor or payee name" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}