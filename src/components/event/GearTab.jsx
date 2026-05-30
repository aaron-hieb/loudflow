import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Package, Trash2, Pencil, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AddFromInventoryPanel from "./AddFromInventoryPanel";

const categoryLabels = {
  audio: "Audio", lighting: "Lighting", video: "Video", staging: "Staging",
  power: "Power", power_cabling: "Power Cabling", data_cabling: "Data Cabling",
  rigging: "Rigging", backline: "Backline", other: "Other",
};

const emptyGearForm = { name: "", category: "audio", quantity: 1, status: "in_shop", assigned_to: "", notes: "" };

export default function GearTab({ eventId, items, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyGearForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm(emptyGearForm); setEditId(null); setShowForm(true); }
  function openEdit(item) {
    setForm({ name: item.name || "", category: item.category || "audio", quantity: item.quantity || 1, status: item.status || "needed", assigned_to: item.assigned_to || "", notes: item.notes || "" });
    setEditId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form, quantity: Number(form.quantity) };
    if (editId) {
      await base44.entities.GearItem.update(editId, payload);
    } else {
      await base44.entities.GearItem.create({ ...payload, event_id: eventId });
    }
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await base44.entities.GearItem.delete(deleteId);
    setDeleting(false);
    setDeleteId(null);
    onRefresh();
  }

  async function handleStatusChange(id, newStatus) {
    await base44.entities.GearItem.update(id, { status: newStatus });
    onRefresh();
  }

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [returningAll, setReturningAll] = useState(false);

  async function handleReturnAll() {
    setReturningAll(true);
    await Promise.all(
      items
        .filter((i) => i.status !== "unpacked")
        .map((i) => base44.entities.GearItem.update(i.id, { status: "unpacked" }))
    );
    setReturningAll(false);
    setShowReturnConfirm(false);
    onRefresh();
  }

  const [collapsed, setCollapsed] = useState(() => {
    // all categories collapsed by default — will be populated as items load
    return Object.fromEntries(Object.keys(categoryLabels).map((k) => [k, true]));
  });
  const [inventoryOpen, setInventoryOpen] = useState(false);

  function toggleCategory(cat) {
    setCollapsed((prev) => ({ ...prev, [cat]: prev[cat] === false ? true : false }));
  }

  const grouped = {};
  items.forEach((item) => {
    const cat = item.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div className="flex gap-6">
      {/* Inventory Panel */}
      {isAdmin && (
        <div className={`shrink-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col transition-all duration-200 ${inventoryOpen ? "w-64" : "w-10"}`} style={{ maxHeight: 600 }}>
          {inventoryOpen ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shop Inventory</p>
                <button onClick={() => setInventoryOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <AddFromInventoryPanel eventId={eventId} existingItems={items} onAdded={onRefresh} />
            </>
          ) : (
            <button
              onClick={() => setInventoryOpen(true)}
              className="flex flex-col items-center justify-center h-full w-full text-muted-foreground hover:text-foreground transition-colors gap-1 py-4"
              title="Open Inventory"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
      )}

      {/* Main gear list */}
      <div className="flex-1 space-y-6">
<div className="flex justify-between items-center">
        <h3 className="font-semibold">Gear &amp; Equipment</h3>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowReturnConfirm(true)} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Return All
              </Button>
            )}
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Gear
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No gear items yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-2 w-full text-left mb-3 group/cat"
              >
                {collapsed[cat] ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{categoryLabels[cat] || cat}</h4>
                <span className="text-xs text-muted-foreground/60">({catItems.length})</span>
              </button>
              {!collapsed[cat] && <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className={`border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 group ${
                      item.status === 'packed' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' :
                      item.status === 'prepped' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' :
                      item.status === 'unloaded' ? 'bg-white border-gray-200 dark:bg-white/10 dark:border-gray-600' :
                      item.status === 'unpacked' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' :
                      item.status === 'rented' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' :
                      'bg-card border-border'
                    }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-mono text-muted-foreground w-8 shrink-0">{item.quantity}x</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {item.assigned_to && <p className="text-xs text-muted-foreground truncate">{item.assigned_to}</p>}
                        {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_shop">In Shop</SelectItem>
                          <SelectItem value="prepped">Prepped</SelectItem>
                          <SelectItem value="packed">Packed</SelectItem>
                          <SelectItem value="unloaded">On Site</SelectItem>
                          <SelectItem value="unpacked">Returned</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                        </SelectContent>
                      </Select>
                      {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEdit(item)} className="p-1 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                         <button onClick={() => setDeleteId(item.id)} className="p-1 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                       </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          ))}
        </div>
      )}

      </div>{/* end main gear list */}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{items.find(i => i.id === deleteId)?.name}</strong> from this event. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return All Confirmation */}
      <Dialog open={showReturnConfirm} onOpenChange={(o) => { if (!o) setShowReturnConfirm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Return All Items?</DialogTitle>
            <DialogDescription>
              This will mark all gear items on this event as <strong>Returned</strong>, freeing them back to shop inventory. This cannot be undone automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowReturnConfirm(false)}>Cancel</Button>
            <Button onClick={handleReturnAll} disabled={returningAll}>
              {returningAll ? "Returning..." : "Return All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Gear Item" : "Add Gear Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Item Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quantity: Math.max(1, Number(form.quantity) - 1) })}
                    className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent transition-colors text-lg font-medium shrink-0"
                  >−</button>
                  <Input
                   type="text"
                   inputMode="numeric"
                   value={form.quantity}
                   onChange={(e) => {
                     const raw = e.target.value.replace(/\D/g, "");
                     setForm({ ...form, quantity: raw === "" ? "" : raw });
                   }}
                   onBlur={() => {
                     const v = parseInt(form.quantity, 10);
                     setForm((f) => ({ ...f, quantity: isNaN(v) || v < 1 ? 1 : v }));
                   }}
                   className="text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quantity: (parseInt(form.quantity, 10) || 1) + 1 })}
                    className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent transition-colors text-lg font-medium shrink-0"
                  >+</button>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_shop">In Shop</SelectItem>
                    <SelectItem value="prepped">Prepped</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="unloaded">On Site</SelectItem>
                    <SelectItem value="unpacked">Returned</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned To</Label>
                <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}