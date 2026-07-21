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
import { Plus, Loader2, Trash2, Pencil, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  reported: { label: "Reported", badge: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", badge: "bg-blue-100 text-blue-700" },
  awaiting_parts: { label: "Awaiting Parts", badge: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", badge: "bg-green-100 text-green-700" },
  scrapped: { label: "Scrapped", badge: "bg-red-100 text-red-700" },
};

const priorityConfig = {
  low: { label: "Low", badge: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-700" },
  high: { label: "High", badge: "bg-red-100 text-red-700" },
};

const categoryLabels = {
  audio: "Audio", lighting: "Lighting", video: "Video", sfx: "SFX",
  staging: "Staging", power: "Power", power_cabling: "Power Cabling",
  data_cabling: "Data Cabling", rigging: "Rigging", backline: "Backline",
  tools: "Tools", other: "Other",
};

const emptyForm = {
  item_name: "", description: "", category: "other",
  status: "reported", priority: "medium", assigned_to: "",
  quantity: 1, notes: "",
};

export default function RepairList() {
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
  const [catFilter, setCatFilter] = useState("all");

  const fetchItems = async () => {
    const data = await base44.entities.Repair.list("-created_date", 200);
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
      category: item.category || "other", status: item.status || "reported",
      priority: item.priority || "medium", assigned_to: item.assigned_to || "",
      quantity: item.quantity ?? 1, notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Repair.update(editing.id, form);
        toast({ title: "Repair updated" });
      } else {
        const me = await base44.auth.me();
        await base44.entities.Repair.create({
          ...form,
          created_by_name: me?.full_name || me?.email || "Unknown",
        });
        toast({ title: "Repair added" });
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
      await base44.entities.Repair.delete(deleteTarget.id);
      setItems((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: "Repair deleted" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => catFilter === "all" || t.category === catFilter);
  const sorted = [...filtered].sort((a, b) => {
    const order = { reported: 0, in_progress: 1, awaiting_parts: 2, completed: 3, scrapped: 4 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const prio = { high: 0, medium: 1, low: 2 };
    return prio[a.priority] - prio[b.priority];
  });

  const counts = {
    all: items.length,
    reported: items.filter((t) => t.status === "reported").length,
    in_progress: items.filter((t) => t.status === "in_progress").length,
    awaiting_parts: items.filter((t) => t.status === "awaiting_parts").length,
    completed: items.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repairs</h1>
            <p className="text-sm text-muted-foreground">Track equipment and gear that needs repair</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Repair
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "reported", label: "Reported" },
            { key: "in_progress", label: "In Progress" },
            { key: "awaiting_parts", label: "Awaiting Parts" },
            { key: "completed", label: "Completed" },
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
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <Wrench className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No repairs logged yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border bg-card transition-colors hover:bg-muted/30",
                (item.status === "completed" || item.status === "scrapped") && "opacity-60"
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
                  {item.assigned_to && <span>Assigned: {item.assigned_to}</span>}
                  {item.created_by_name && <span>By: {item.created_by_name}</span>}
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
            <DialogTitle>{editing ? "Edit Repair" : "Add Repair"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="What needs repair?"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's wrong with it?"
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
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Who's fixing it?"
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
                {editing ? "Save" : "Add Repair"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Repair"
        description={`Are you sure you want to delete "${deleteTarget?.item_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}