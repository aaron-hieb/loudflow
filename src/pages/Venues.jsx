import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, Phone, Users, Clock, Car, Wifi } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const EMPTY_FORM = {
  venue_name: "", address: "", city: "", state: "", zip: "", country: "",
  capacity: "", contact_name: "", contact_phone: "", contact_email: "",
  load_in_time: "", load_out_time: "", parking_info: "", wifi_info: "", notes: ""
};

export default function Venues() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const results = await base44.entities.VenueLibrary.list("-created_date");
    setVenues(results);
    setLoading(false);
  }

  function openNew() {
    setEditingVenue(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(v) {
    setEditingVenue(v);
    setForm({ ...EMPTY_FORM, ...v });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form };
    if (payload.capacity) payload.capacity = Number(payload.capacity);
    else delete payload.capacity;
    if (editingVenue) {
      await base44.entities.VenueLibrary.update(editingVenue.id, payload);
    } else {
      await base44.entities.VenueLibrary.create(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function handleDelete(v) {
    if (!confirm(`Delete "${v.venue_name}" from the library?`)) return;
    await base44.entities.VenueLibrary.delete(v.id);
    load();
  }

  const filtered = venues.filter(v =>
    v.venue_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Venue Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Save venues to quickly import into events</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Add Venue
          </Button>
        )}
      </div>

      <Input
        placeholder="Search venues..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">{search ? "No venues match your search" : "No venues in your library yet"}</p>
          {isAdmin && !search && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add Your First Venue
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm leading-tight">{v.venue_name}</p>
                    {(v.city || v.state) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[v.city, v.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(v)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {v.address && <p className="truncate">{v.address}</p>}
                {v.capacity && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Capacity: {Number(v.capacity).toLocaleString()}
                  </div>
                )}
                {(v.load_in_time || v.load_out_time) && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {v.load_in_time && `In: ${v.load_in_time}`}
                    {v.load_in_time && v.load_out_time && " · "}
                    {v.load_out_time && `Out: ${v.load_out_time}`}
                  </div>
                )}
                {v.contact_name && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {v.contact_name}
                  </div>
                )}
                {v.wifi_info && (
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> {v.wifi_info}
                  </div>
                )}
                {v.parking_info && (
                  <div className="flex items-center gap-1">
                    <Car className="h-3 w-3" /> {v.parking_info.slice(0, 60)}{v.parking_info.length > 60 ? "…" : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVenue ? "Edit Venue" : "Add Venue"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <Label>Venue Name *</Label>
              <Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>State / Province</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>Zip / Postal Code</Label>
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <Label>Venue Contact Name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <Label>Load-In Time</Label>
              <Input value={form.load_in_time} onChange={(e) => setForm({ ...form, load_in_time: e.target.value })} />
            </div>
            <div>
              <Label>Load-Out Time</Label>
              <Input value={form.load_out_time} onChange={(e) => setForm({ ...form, load_out_time: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Parking Info</Label>
              <Textarea value={form.parking_info} onChange={(e) => setForm({ ...form, parking_info: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>WiFi Info</Label>
              <Input value={form.wifi_info} onChange={(e) => setForm({ ...form, wifi_info: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.venue_name}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}