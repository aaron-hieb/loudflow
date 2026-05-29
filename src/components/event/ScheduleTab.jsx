import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Clock, MapPin, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";
import { cn } from "@/lib/utils";

const typeColors = {
  travel: "border-l-sky-500",
  meeting: "border-l-emerald-500",
  meal: "border-l-orange-400",
  load_in: "border-l-blue-500",
  sound_check: "border-l-amber-500",
  doors: "border-l-violet-500",
  show: "border-l-primary",
  load_out: "border-l-slate-500",
  other: "border-l-muted-foreground",
};

const typeLabels = {
  travel: "Travel",
  meeting: "Meeting",
  meal: "Meal",
  load_in: "Load In",
  sound_check: "Soundcheck",
  doors: "Doors",
  show: "Show",
  load_out: "Load Out",
  other: "Other",
};

const emptyForm = { title: "", date: "", start_time: "", end_time: "", location: "", assigned_to: "", type: "other", notes: "" };

function formatTime(t) {
  if (!t) return "";
  return moment(t, "HH:mm").format("h:mm A");
}

export default function ScheduleTab({ eventId, items, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true); }
  function openEdit(item) {
    setForm({ title: item.title || "", date: item.date || "", start_time: item.start_time || "", end_time: item.end_time || "", location: item.location || "", assigned_to: item.assigned_to || "", type: item.type || "other", notes: item.notes || "" });
    setEditId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editId) {
      await base44.entities.ScheduleItem.update(editId, form);
    } else {
      await base44.entities.ScheduleItem.create({ ...form, event_id: eventId });
    }
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function handleDelete(id) {
    await base44.entities.ScheduleItem.delete(id);
    onRefresh();
  }

  const grouped = {};
  items.forEach((item) => {
    const day = item.date || "Unscheduled";
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(item);
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")));

  const sortedDays = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Schedule</h3>
        {isAdmin && (
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No schedule items yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {day === "Unscheduled" ? day : moment(day).format("ddd, MMM D, YYYY")}
              </h4>
              <div className="space-y-2">
                {grouped[day].map((item) => (
                  <div key={item.id} className={cn("bg-card border border-border rounded-lg p-4 border-l-4 flex items-start justify-between group", typeColors[item.type] || "border-l-muted-foreground")}>
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{typeLabels[item.type] || item.type}</span>
                         {item.start_time && (
                           <span className="text-xs text-muted-foreground">
                             {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ""}
                           </span>
                         )}
                       </div>
                       <p className="font-medium text-sm">{item.title}</p>
                       <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                         {item.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>}
                         {item.assigned_to && <span>{item.assigned_to}</span>}
                         </div>
                         {item.notes && <p className="mt-1.5 text-xs text-muted-foreground italic">{item.notes}</p>}
                         </div>
                     {isAdmin && (
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEdit(item)} className="p-1 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                       <button onClick={() => handleDelete(item.id)} className="p-1 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                     </div>
                     )}
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Schedule Item" : "Add Schedule Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title || !form.date || saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}