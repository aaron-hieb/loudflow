import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Package, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const categoryLabels = {
  audio: "Audio", lighting: "Lighting", video: "Video", sfx: "SFX", staging: "Staging",
  power: "Power", power_cabling: "Power Cabling", data_cabling: "Data Cabling",
  rigging: "Rigging", backline: "Backline", other: "Other"
};

const emptyForm = { name: "", category: "audio", quantity: 1, notes: "" };

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
  Object.fromEntries(Object.keys(categoryLabels).map((k) => [k, true]))
  );
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {load();}, []);

  async function load() {
    const data = await base44.entities.InventoryItem.list();
    setItems(data);
    setLoading(false);
  }

  function openAdd() {setForm(emptyForm);setEditId(null);setShowForm(true);}
  function openEdit(item) {
    setForm({ name: item.name || "", category: item.category || "audio", quantity: item.quantity || 1, notes: item.notes || "" });
    setEditId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form, quantity: Number(form.quantity) };
    if (editId) {
      await base44.entities.InventoryItem.update(editId, payload);
    } else {
      await base44.entities.InventoryItem.create(payload);
    }
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleDelete() {
    await base44.entities.InventoryItem.delete(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  function toggleCategory(cat) {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  const grouped = {};
  items.forEach((item) => {
    const cat = item.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Master catalog of all gear Loud owns
          </p>
        </div>
        {isAdmin && <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      </div>

      {items.length === 0 ?
      <div className="text-center py-20 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No inventory items yet</p>
          {isAdmin && <p className="text-sm mt-1">Add gear to build your master catalog</p>}
        </div> :

      <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) =>
        <div key={cat}>
              <button
            onClick={() => toggleCategory(cat)}
            className="flex items-center gap-2 w-full text-left mb-3">
            
                {collapsed[cat] ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{categoryLabels[cat] || cat}</h4>
                <span className="text-xs text-muted-foreground/60">({catItems.length})</span>
              </button>
              {!collapsed[cat] &&
          <div className="space-y-2">
                  {catItems.map((item) =>
            <div key={item.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-2 group bg-card">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-mono text-muted-foreground">Qty: {item.quantity}</span>
                        {isAdmin &&
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)} className="p-1 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTarget(item)} className="p-1 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </div>
                }
                      </div>
                    </div>
            )}
                </div>
          }
            </div>
        )}
        </div>
      }

      <Dialog open={showForm} onOpenChange={(o) => {if (!o) setShowForm(false);}}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
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
                <Label>Quantity Owned</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
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

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Item?"
        itemName={deleteTarget?.name}
      />
    </div>);

}