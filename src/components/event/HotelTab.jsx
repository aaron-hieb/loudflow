import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, BedDouble, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

export default function HotelTab({ eventId, hotels, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ guest_name: "", hotel_name: "", address: "", check_in: "", check_out: "", room_type: "", confirmation_number: "", nightly_rate: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const payload = { ...form, event_id: eventId };
    if (payload.nightly_rate) payload.nightly_rate = Number(payload.nightly_rate);
    else delete payload.nightly_rate;
    await base44.entities.Hotel.create(payload);
    setShowAdd(false);
    setForm({ guest_name: "", hotel_name: "", address: "", check_in: "", check_out: "", room_type: "", confirmation_number: "", nightly_rate: "", notes: "" });
    setSaving(false);
    onRefresh();
  }

  async function handleDelete(id) {
    await base44.entities.Hotel.delete(id);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Hotels</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Hotel
        </Button>
      </div>

      {hotels.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BedDouble className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hotel bookings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotels.map((h) => (
            <div key={h.id} className="bg-card border border-border rounded-lg p-4 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BedDouble className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-sm">{h.hotel_name}</span>
                    {h.confirmation_number && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{h.confirmation_number}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{h.guest_name}</p>
                  <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                    {h.check_in && <span>{moment(h.check_in).format("MMM D")} – {h.check_out ? moment(h.check_out).format("MMM D") : "?"}</span>}
                    {h.room_type && <span>{h.room_type}</span>}
                    {h.nightly_rate && <span>${h.nightly_rate}/night</span>}
                  </div>
                  {h.address && (
                    <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{h.address}
                    </p>
                  )}
                </div>
                <button onClick={() => handleDelete(h.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hotel Booking</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Guest Name *</Label>
                <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>Hotel Name *</Label>
                <Input value={form.hotel_name} onChange={(e) => setForm({ ...form, hotel_name: e.target.value })} />
              </div>
              <div>
                <Label>Check-In</Label>
                <Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
              </div>
              <div>
                <Label>Check-Out</Label>
                <Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
              </div>
              <div>
                <Label>Room Type</Label>
                <Input value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} />
              </div>
              <div>
                <Label>Nightly Rate</Label>
                <Input type="number" value={form.nightly_rate} onChange={(e) => setForm({ ...form, nightly_rate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Confirmation #</Label>
              <Input value={form.confirmation_number} onChange={(e) => setForm({ ...form, confirmation_number: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!form.guest_name || !form.hotel_name || saving}>
                {saving ? "Adding..." : "Add Booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}