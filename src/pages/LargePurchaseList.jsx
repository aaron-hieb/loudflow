import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, Trash2, Pencil, PackageOpen, ExternalLink, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  researching: { label: "Researching", badge: "bg-slate-100 text-slate-700" },
  approved: { label: "Approved", badge: "bg-blue-100 text-blue-700" },
  ordered: { label: "Ordered", badge: "bg-amber-100 text-amber-700" },
  received: { label: "Received", badge: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", badge: "bg-red-100 text-red-700" },
};

const priorityConfig = {
  low: { label: "Low", badge: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-700" },
  high: { label: "High", badge: "bg-red-100 text-red-700" },
};

const categoryLabels = {
  audio: "Audio", lighting: "Lighting", video: "Video", sfx: "SFX",
  staging: "Staging", power: "Power", rigging: "Rigging",
  backline: "Backline", vehicle: "Vehicle", tools: "Tools", other: "Other",
};

const emptyForm = {
  item_name: "", description: "", category: "other", vendor: "",
  estimated_cost: "", actual_cost: "", quantity: 1,
  status: "researching", priority: "medium", purchase_date: "",
  link: "", notes: "",
};

const formatMoney = (val) => {
  if (val === null || val === undefined || val === "") return null;
  return `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function LargePurchaseList() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchItems = async () => {
    const data = await base44.entities.LargePurchase.list("-created_date", 200);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      item_name: item.item_name || "", description: item.description || "",
      category: item.category || "other", vendor: item.vendor || "",
      estimated_cost: item.estimated_cost ?? "", actual_cost: item.actual_cost ?? "",
      quantity: item.quantity ?? 1, status: item.status || "researching",
      priority: item.priority || "medium", purchase_date: item.purchase_date || "",
      link: item.link || "", notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 1,
        estimated_cost: form.estimated_cost === "" ? null : Number(form.estimated_cost),
        actual_cost: form.actual_cost === "" ? null : Number(form.actual_cost),
      };
      if (editing) {
        await base44.entities.LargePurchase.update(editing.id, payload);
        toast({ title: "Large purchase updated" });
      } else {
        const me = await base44.auth.me();
        await base44.entities.LargePurchase.create({
          ...payload,
          created_by_name: me?.full_name || me?.email || "Unknown",
        });
        toast({ title: "Large purchase added" });
      }
      setDialogOpen(false);
      fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.LargePurchase.delete(deleteTarget.id);
      setItems((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: "Large purchase deleted" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = filter === "all" ? items : items.filter((t) => t.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const order = { researching: 0, approved: 1, ordered: 2, received: 3, cancelled: 4 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const prio = { high: 0, medium: 1, low: 2 };
    return prio[a.priority] - prio[b.priority];
  });

  const counts = {
    all: items.length,
    researching: items.filter((t) => t.status === "researching").length,
    approved: items.filter((t) => t.status === "approved").length,
    ordered: items.filter((t) => t.status === "ordered").length,
    received: items.filter((t) => t.status === "received").length,
  };

  const totalEst = items
    .filter((t) => t.status !== "received" && t.status !== "cancelled")
    .reduce((sum, t) => sum + (Number(t.estimated_cost) || 0) * (Number(t.quantity) || 1), 0);
  const totalActual = items
    .filter((t) => t.actual_cost != null)
    .reduce((sum, t) => sum + (Number(t.actual_cost) || 0) * (Number(t.quantity) || 1), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <PackageOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Large Purchases</h1>
            <p className="text-sm text-muted-foreground">Major equipment and capital purchases</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Purchase
        </Button>
      </div>

      {(totalEst > 0 || totalActual > 0) && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex-wrap">
          <DollarSign className="h-4 w-4" />
          {totalEst > 0 && <span className="font-medium">Estimated (open): {formatMoney(totalEst)}</span>}
          {totalActual > 0 && <span className="font-medium">Actual spent: {formatMoney(totalActual)}</span>}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "researching", label: "Researching" },
          { key: "approved", label: "Approved" },
          { key: "ordered", label: "Ordered" },
          { key: "received", label: "Received" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {f.label} <span className="opacity-70">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No large purchases yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border bg-card transition-colors hover:bg-muted/30",
                (item.status === "received" || item.status === "cancelled") && "opacity-60"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{item.item_name}</p>
                  {item.quantity > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">×{item.quantity}</span>
                  )}
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityConfig[item.priority]?.badge)}>
                    {priorityConfig[item.priority]?.label}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusConfig[item.status]?.badge)}>
                    {statusConfig[item.status]?.label}
                  </span>
                  {item.category && item.category !== "other" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {categoryLabels[item.category]}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {item.estimated_cost != null && <span>Est: {formatMoney(item.estimated_cost)}</span>}
                  {item.actual_cost != null && <span>Actual: {formatMoney(item.actual_cost)}</span>}
                  {item.vendor && <span>Vendor: {item.vendor}</span>}
                  {item.purchase_date && <span>Purchased: {item.purchase_date}</span>}
                  {item.created_by_name && <span>By: {item.created_by_name}</span>}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(item)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(item)} title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Large Purchase" : "Add Large Purchase"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="What's being purchased?"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Add details, justification, specs..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.estimated_cost}
                  onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actual_cost">Actual Cost ($)</Label>
                <Input
                  id="actual_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.actual_cost}
                  onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="Where to buy"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Purchase Link</Label>
              <Input
                id="link"
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.item_name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? "Save" : "Add Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Large Purchase"
        description={`Are you sure you want to delete "${deleteTarget?.item_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}