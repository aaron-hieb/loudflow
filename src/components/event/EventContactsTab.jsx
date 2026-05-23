import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Users, Mail, Phone, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const categoryColors = {
  crew: "bg-blue-100 text-blue-700",
  vendor: "bg-violet-100 text-violet-700",
  client: "bg-emerald-100 text-emerald-700",
  venue: "bg-amber-100 text-amber-700",
  talent: "bg-rose-100 text-rose-700",
  other: "bg-slate-100 text-slate-700",
};

function ContactPopup({ person, onClose }) {
  if (!person) return null;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>{person.name}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">{person.role}{person.company ? ` @ ${person.company}` : ""}</p>
        <div className="flex flex-col gap-2 mt-2">
          {person.phone && (
            <a href={`tel:${person.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Call</p>
                <p className="text-sm font-medium">{person.phone}</p>
              </div>
            </a>
          )}
          {person.email && (
            <a href={`mailto:${person.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{person.email}</p>
              </div>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventContactsTab({ eventId, isAdmin }) {
  const [contacts, setContacts] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [contactPopup, setContactPopup] = useState(null);
  const [allContacts, setAllContacts] = useState([]);
  const [linkedIds, setLinkedIds] = useState([]);

  // For simplicity, we'll store event-contact links as a comma-separated list in localStorage
  // In a real app you'd have a junction entity
  const storageKey = `event_contacts_${eventId}`;

  useEffect(() => {
    loadContacts();
  }, [eventId]);

  async function loadContacts() {
    const stored = localStorage.getItem(storageKey);
    const ids = stored ? stored.split(",").filter(Boolean) : [];
    setLinkedIds(ids);
    
    const all = await base44.entities.Contact.list("-created_date", 100);
    setAllContacts(all);
    setContacts(all.filter((c) => ids.includes(c.id)));
  }

  function linkContact(id) {
    const newIds = [...linkedIds, id];
    localStorage.setItem(storageKey, newIds.join(","));
    setLinkedIds(newIds);
    setContacts(allContacts.filter((c) => newIds.includes(c.id)));
    setShowPicker(false);
  }

  function unlinkContact(id) {
    const newIds = linkedIds.filter((i) => i !== id);
    localStorage.setItem(storageKey, newIds.join(","));
    setLinkedIds(newIds);
    setContacts(allContacts.filter((c) => newIds.includes(c.id)));
  }

  const unlinked = allContacts.filter((c) => !linkedIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Event Contacts</h3>
        {isAdmin && (
        <Button size="sm" onClick={() => setShowPicker(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Link Contact
        </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No contacts linked to this event</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {c.name?.[0] || "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.name}</span>
                    {c.category && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", categoryColors[c.category] || categoryColors.other)}>
                        {c.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    {c.role && <span>{c.role}</span>}
                    {c.company && <span>@ {c.company}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(c.email || c.phone) && (
                  <button onClick={() => setContactPopup(c)} className="p-1.5 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" />
                  </button>
                )}
                {isAdmin && (
                <button onClick={() => unlinkContact(c.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContactPopup person={contactPopup} onClose={() => setContactPopup(null)} />

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link a Contact</DialogTitle></DialogHeader>
          {unlinked.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">All contacts are already linked. Add new contacts from the Contacts page.</p>
          ) : (
            <div className="space-y-2 mt-2 max-h-72 overflow-y-auto">
              {unlinked.map((c) => (
                <button key={c.id} onClick={() => linkContact(c.id)} className="w-full text-left bg-muted/50 hover:bg-muted rounded-lg p-3 flex items-center gap-3 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {c.name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role} {c.company ? `@ ${c.company}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}