import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Clock, MapPin, Trash2, Pencil, ChevronDown, ChevronRight, Paperclip, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";
import { cn } from "@/lib/utils";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import WindLightningWidget from "./WindLightningWidget";

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

const emptyForm = { title: "", date: "", start_time: "", end_time: "", location: "", assigned_to: "", type: "other", notes: "", attached_file_id: "", attached_file_name: "", attached_file_url: "" };

function formatTime(t) {
  if (!t) return "";
  return moment(t, "HH:mm").format("h:mm A");
}

function DayGroup({ day, items, isAdmin, onEdit, onDelete }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        {day === "Unscheduled" ? day : moment(day).format("ddd, MMM D, YYYY")}
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={cn("bg-card border border-border rounded-lg p-4 border-l-4 flex items-start justify-between group", typeColors[item.type] || "border-l-muted-foreground")}>
            <div className="flex-1 min-w-0">
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
              {item.attached_file_url && (
                <a
                  href={item.attached_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Paperclip className="h-3 w-3" />
                  {item.attached_file_name || "Attached File"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                <button onClick={() => onEdit(item)} className="p-1 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => onDelete(item)} className="p-1 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScheduleTab({ eventId, items, onRefresh, isAdmin, city, eventFiles = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true); }
  function openEdit(item) {
    setForm({ title: item.title || "", date: item.date || "", start_time: item.start_time || "", end_time: item.end_time || "", location: item.location || "", assigned_to: item.assigned_to || "", type: item.type || "other", notes: item.notes || "", attached_file_id: item.attached_file_id || "", attached_file_name: item.attached_file_name || "", attached_file_url: item.attached_file_url || "" });
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

  async function handleDelete() {
    await base44.entities.ScheduleItem.delete(deleteTarget.id);
    setDeleteTarget(null);
    onRefresh();
  }

  const today = moment().format("YYYY-MM-DD");

  const pastItems = items.filter((item) => item.date && item.date < today);
  const currentItems = items.filter((item) => !item.date || item.date >= today);

  const groupItems = (list) => {
    const g = {};
    list.forEach((item) => {
      const day = item.date || "Unscheduled";
      if (!g[day]) g[day] = [];
      g[day].push(item);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")));
    return g;
  };

  const grouped = groupItems(currentItems);
  const sortedDays = Object.keys(grouped).sort();

  const pastGrouped = groupItems(pastItems);
  const pastSortedDays = Object.keys(pastGrouped).sort().reverse();

  return (
    <div className="space-y-6">
      {city && <WindLightningWidget city={city} />}
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
          {/* Past items collapsible */}
          {pastSortedDays.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast((p) => !p)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-b border-border"
              >
                {showPast ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium">Past Items ({pastItems.length})</span>
              </button>
              {showPast && (
                <div className="space-y-6 mt-4 opacity-70">
                  {pastSortedDays.map((day) => (
                    <DayGroup key={day} day={day} items={pastGrouped[day]} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteTarget} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming / current days */}
          {sortedDays.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">No upcoming schedule items</div>
          )}
          {sortedDays.map((day) => (
            <DayGroup key={day} day={day} items={grouped[day]} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Item?"
        itemName={deleteTarget?.title}
      />

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
            <div>
              <Label>Attach File</Label>
              {eventFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">No files uploaded yet. Add files in the Files tab.</p>
              ) : (
                <div className="mt-1 space-y-1">
                  {form.attached_file_id ? (
                    <div className="flex items-center gap-2 text-sm border border-border rounded-md px-3 py-2">
                      <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="flex-1 truncate">{form.attached_file_name}</span>
                      <button type="button" onClick={() => setForm({ ...form, attached_file_id: "", attached_file_name: "", attached_file_url: "" })} className="hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Select value={form.attached_file_id} onValueChange={(fileId) => {
                      const file = eventFiles.find((f) => f.id === fileId);
                      if (file) setForm({ ...form, attached_file_id: file.id, attached_file_name: file.name, attached_file_url: file.file_url });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select a file…" /></SelectTrigger>
                      <SelectContent>
                        {eventFiles.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
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