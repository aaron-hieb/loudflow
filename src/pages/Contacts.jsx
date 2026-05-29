import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Mail, Phone, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const categoryColors = {
  crew: "bg-blue-100 text-blue-700",
  vendor: "bg-violet-100 text-violet-700",
  client: "bg-emerald-100 text-emerald-700",
  venue: "bg-amber-100 text-amber-700",
  talent: "bg-rose-100 text-rose-700",
  other: "bg-slate-100 text-slate-700",
};

const emptyForm = { name: "", role: "", company: "", email: "", phone: "", category: "crew", notes: "", emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "" };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    const data = await base44.entities.Contact.list("-created_date", 200);
    setContacts(data);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    if (editId) {
      await base44.entities.Contact.update(editId, form);
    } else {
      await base44.entities.Contact.create(form);
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setSaving(false);
    loadContacts();
  }

  async function handleDelete(id) {
    await base44.entities.Contact.delete(id);
    loadContacts();
  }

  function openEdit(contact) {
    setForm({
      name: contact.name || "", role: contact.role || "", company: contact.company || "",
      email: contact.email || "", phone: contact.phone || "", category: contact.category || "other",
      notes: contact.notes || "",
      emergency_contact_name: contact.emergency_contact_name || "",
      emergency_contact_phone: contact.emergency_contact_phone || "",
      emergency_contact_relationship: contact.emergency_contact_relationship || "",
    });
    setEditId(contact.id);
    setShowForm(true);
  }

  const filtered = contacts.filter((c) => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || c.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="crew">Crew</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="venue">Venue</SelectItem>
            <SelectItem value="talent">Talent</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No contacts found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {c.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role}{c.company ? ` @ ${c.company}` : ""}</p>
                  </div>
                </div>
                {c.category && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", categoryColors[c.category] || categoryColors.other)}>
                    {c.category}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      <Mail className="h-3.5 w-3.5" /> {c.email}
                    </a>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:text-primary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 transition-colors">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </a>
              )}
              {c.notes && (
                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded px-2 py-1.5 leading-relaxed">{c.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
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
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crew">Crew</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="venue">Venue</SelectItem>
                  <SelectItem value="talent">Talent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {form.category === "crew" && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Name</Label>
                    <Input placeholder="e.g. Jane Doe" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input placeholder="e.g. Spouse, Parent" value={form.emergency_contact_relationship} onChange={(e) => setForm({ ...form, emergency_contact_relationship: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Contact Phone</Label>
                    <Input placeholder="Phone number" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || saving}>
                {saving ? "Saving..." : editId ? "Update" : "Add Contact"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}