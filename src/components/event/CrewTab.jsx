import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Users, Trash2, Mail, Phone, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const deptLabels = {
  audio: "Audio", lighting: "Lighting", video: "Video", staging: "Staging",
  rigging: "Rigging", production: "Production", logistics: "Logistics",
  security: "Security", catering: "Catering", other: "Other",
};

const statusStyles = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const emptyForm = { name: "", role: "", department: "production", phone: "", email: "", status: "confirmed", notes: "" };

export default function CrewTab({ eventId, crew, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    if (editId) {
      await base44.entities.CrewMember.update(editId, form);
    } else {
      await base44.entities.CrewMember.create({ ...form, event_id: eventId });
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setSaving(false);
    onRefresh();
  }

  async function handleDelete(id) {
    await base44.entities.CrewMember.delete(id);
    onRefresh();
  }

  function openEdit(member) {
    setForm({
      name: member.name || "", role: member.role || "", department: member.department || "other",
      phone: member.phone || "", email: member.email || "", status: member.status || "confirmed",
      notes: member.notes || "",
    });
    setEditId(member.id);
    setShowForm(true);
  }

  // Group by department
  const grouped = {};
  crew.forEach((m) => {
    const dept = m.department || "other";
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(m);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Crew List <span className="text-muted-foreground font-normal text-sm">({crew.length})</span></h3>
        <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Crew
        </Button>
      </div>

      {crew.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No crew members added yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dept, members]) => (
            <div key={dept}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {deptLabels[dept] || dept}
              </h4>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {m.name?.[0] || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{m.name}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", statusStyles[m.status] || statusStyles.pending)}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.role}</p>
                        <div className="flex gap-3 mt-1">
                          {m.email && (
                            <a href={`mailto:${m.email}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                              <Mail className="h-3 w-3" />{m.email}
                            </a>
                          )}
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                              <Phone className="h-3 w-3" />{m.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(m)} className="p-1.5 hover:text-primary transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Crew Member" : "Add Crew Member"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Role *</Label>
                <Input placeholder="e.g. FOH Engineer" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(deptLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || !form.role || saving}>
                {saving ? "Saving..." : editId ? "Update" : "Add to Crew"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}