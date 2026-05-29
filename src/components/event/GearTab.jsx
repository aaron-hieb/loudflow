import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Package, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

  async function handleDelete(id) {
    await base44.entities.GearItem.delete(id);
    onRefresh();
  }

  async function handleStatusChange(id, newStatus) {
    await base44.entities.GearItem.update(id, { status: newStatus });
    onRefresh();
  }

  const grouped = {};
  items.forEach((item) => {
    const cat = item.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Gear &amp; Equipment</h3>
        {isAdmin && (
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Gear
        </Button>
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
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">{categoryLabels[cat] || cat}</h4>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-muted-foreground w-8">{item.quantity}x</span>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.assigned_to && <p className="text-xs text-muted-foreground">{item.assigned_to}</p>}
                        {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_shop">In Shop</SelectItem>
                          <SelectItem value="prepped">Prepped</SelectItem>
                          <SelectItem value="packed">Packed</SelectItem>
                          <SelectItem value="unloaded">Unloaded</SelectItem>
                          <SelectItem value="unpacked">Unpacked</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                        </SelectContent>
                      </Select>
                      {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEdit(item)} className="p-1 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                         <button onClick={() => handleDelete(item.id)} className="p-1 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                       </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_shop">In Shop</SelectItem>
                    <SelectItem value="prepped">Prepped</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="unloaded">Unloaded</SelectItem>
                    <SelectItem value="unpacked">Unpacked</SelectItem>
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