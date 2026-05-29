import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Plane, Trash2, Pencil, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const emptyFlightForm = { passenger: "", airline: "", flight_number: "", departure_city: "", arrival_city: "", departure_date: "", arrival_date: "", confirmation_code: "", notes: "" };

const statusConfig = {
  scheduled: { label: "Scheduled", color: "text-blue-600 bg-blue-50", icon: Clock },
  active: { label: "In Air", color: "text-emerald-600 bg-emerald-50", icon: Plane },
  landed: { label: "Landed", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: AlertCircle },
  incident: { label: "Incident", color: "text-orange-600 bg-orange-50", icon: AlertCircle },
  diverted: { label: "Diverted", color: "text-yellow-600 bg-yellow-50", icon: AlertCircle },
};

function FlightStatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, color: "text-slate-600 bg-slate-100", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

export default function TravelTab({ eventId, flights, onRefresh, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyFlightForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [liveStatus, setLiveStatus] = useState({});
  const [loadingStatus, setLoadingStatus] = useState({});

  async function fetchFlightStatus(flightId, flightNumber) {
    if (!flightNumber) return;
    setLoadingStatus((p) => ({ ...p, [flightId]: true }));
    const res = await base44.functions.invoke('flightStatus', { flight_number: flightNumber });
    setLiveStatus((p) => ({ ...p, [flightId]: res.data }));
    setLoadingStatus((p) => ({ ...p, [flightId]: false }));
  }

  function openAdd() { setForm(emptyFlightForm); setEditId(null); setShowForm(true); }
  function openEdit(f) {
    setForm({ passenger: f.passenger || "", airline: f.airline || "", flight_number: f.flight_number || "", departure_city: f.departure_city || "", arrival_city: f.arrival_city || "", departure_date: f.departure_date ? moment(f.departure_date).format("YYYY-MM-DDTHH:mm") : "", arrival_date: f.arrival_date ? moment(f.arrival_date).format("YYYY-MM-DDTHH:mm") : "", confirmation_code: f.confirmation_code || "", notes: f.notes || "" });
    setEditId(f.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editId) {
      await base44.entities.Flight.update(editId, form);
    } else {
      await base44.entities.Flight.create({ ...form, event_id: eventId });
    }
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function handleDelete(id) {
    await base44.entities.Flight.delete(id);
    onRefresh();
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Flights</h3>
        {isAdmin && (
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Flight
        </Button>
        )}
      </div>

      {flights.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No flights added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flights.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-lg p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{f.passenger}</span>
                    {f.confirmation_code && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{f.confirmation_code}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                   <div className="text-center">
                     <p className="font-semibold">{f.departure_city || "—"}</p>
                     {f.departure_date && <p className="text-xs text-muted-foreground">{moment(f.departure_date).format("MMM D, h:mm A")}</p>}
                   </div>
                   <span className="text-muted-foreground text-lg">→</span>
                   <div className="text-center">
                     <p className="font-semibold">{f.arrival_city || "—"}</p>
                     {f.arrival_date && <p className="text-xs text-muted-foreground">{moment(f.arrival_date).format("MMM D, h:mm A")}</p>}
                   </div>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                   {f.airline && <span>{f.airline} {f.flight_number}</span>}
                  </div>
                  {f.notes && <p className="mt-1.5 text-xs text-muted-foreground italic">{f.notes}</p>}

                  {/* Live status */}
                  {liveStatus[f.id] && liveStatus[f.id].found && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <FlightStatusBadge status={liveStatus[f.id].flight_status} />
                        {liveStatus[f.id].departure?.delay > 0 && (
                          <span className="text-xs text-orange-600 font-medium">+{liveStatus[f.id].departure.delay} min delay</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Departure</p>
                          {liveStatus[f.id].departure?.terminal && <p>Terminal {liveStatus[f.id].departure.terminal}{liveStatus[f.id].departure.gate ? ` · Gate ${liveStatus[f.id].departure.gate}` : ""}</p>}
                          {liveStatus[f.id].departure?.estimated && <p className="text-muted-foreground">{moment(liveStatus[f.id].departure.estimated).format("h:mm A")} est.</p>}
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Arrival</p>
                          {liveStatus[f.id].arrival?.terminal && <p>Terminal {liveStatus[f.id].arrival.terminal}{liveStatus[f.id].arrival.gate ? ` · Gate ${liveStatus[f.id].arrival.gate}` : ""}</p>}
                          {liveStatus[f.id].arrival?.estimated && <p className="text-muted-foreground">{moment(liveStatus[f.id].arrival.estimated).format("h:mm A")} est.</p>}
                        </div>
                      </div>
                    </div>
                  )}
                  {liveStatus[f.id] && !liveStatus[f.id].found && (
                    <p className="mt-2 text-xs text-muted-foreground italic">No live data found for this flight.</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {f.flight_number && (
                    <button
                      onClick={() => fetchFlightStatus(f.id, f.flight_number)}
                      disabled={loadingStatus[f.id]}
                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingStatus[f.id] ? "animate-spin" : ""}`} />
                      {liveStatus[f.id] ? "Refresh" : "Live Status"}
                    </button>
                  )}
                {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(f)} className="p-1 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(f.id)} className="p-1 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
                )}
                </div>
                </div>
                </div>
                ))}
                </div>
                )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Flight" : "Add Flight"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Passenger *</Label>
              <Input value={form.passenger} onChange={(e) => setForm({ ...form, passenger: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Airline</Label>
                <Input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} />
              </div>
              <div>
                <Label>Flight #</Label>
                <Input value={form.flight_number} onChange={(e) => setForm({ ...form, flight_number: e.target.value })} />
              </div>
              <div>
                <Label>From</Label>
                <Input value={form.departure_city} onChange={(e) => setForm({ ...form, departure_city: e.target.value })} />
              </div>
              <div>
                <Label>To</Label>
                <Input value={form.arrival_city} onChange={(e) => setForm({ ...form, arrival_city: e.target.value })} />
              </div>
              <div>
                <Label>Departure *</Label>
                <Input type="datetime-local" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
              </div>
              <div>
                <Label>Arrival</Label>
                <Input type="datetime-local" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Confirmation Code</Label>
              <Input value={form.confirmation_code} onChange={(e) => setForm({ ...form, confirmation_code: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.passenger || !form.departure_date || saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Flight"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}