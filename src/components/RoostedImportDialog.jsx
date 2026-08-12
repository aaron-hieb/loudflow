import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, Calendar, MapPin, Building2, User, Mail, Phone, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const MODE_CONFIG = {
  events: {
    title: "Import Event from Roosted",
    description: "Create a FlowDaddy event from a Roosted event.",
    resource: "events",
  },
  venues: {
    title: "Import Venue from Roosted",
    description: "Add a Roosted location to your venue library.",
    resource: "locations",
  },
  contacts: {
    title: "Import Contacts from Roosted",
    description: "Pull client or worker info into your contacts.",
  },
};

export default function RoostedImportDialog({ open, onOpenChange, mode = "events", onImported }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cfg = MODE_CONFIG[mode];
  const [subMode, setSubMode] = useState("clients");
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  const resource = mode === "contacts" ? subMode : cfg.resource;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setItems([]);
    setSearch("");
    base44.functions.invoke("roostedEvents", { action: "list", resource })
      .then((res) => setItems(res.data.items || []))
      .catch(() => toast({ title: "Failed to load from Roosted", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, resource]);

  const searchKeys = {
    events: ["name", "city"],
    locations: ["name", "city", "address"],
    clients: ["name", "company_name", "contact_name", "city"],
    workers: ["name", "role", "areas"],
  }[resource];

  const filtered = items.filter((it) =>
    !search || searchKeys.some((k) => (it[k] || "").toLowerCase().includes(search.toLowerCase()))
  );

  async function handleImport(it) {
    setImportingId(it.id);
    try {
      const res = await base44.functions.invoke("roostedEvents", { action: "import", resource, roosted_id: it.id });
      toast({ title: "Imported successfully" });
      onOpenChange(false);
      if (mode === "events") {
        navigate(`/events/${res.data.item.id}`);
      } else if (onImported) {
        onImported(res.data.item);
      }
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setImportingId(null);
    }
  }

  function renderRow(it) {
    if (resource === "events") {
      return (
        <>
          <p className="font-medium truncate">{it.name || "Untitled"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            {it.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{it.date}</span>}
            {(it.venue || it.city) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[it.venue, it.city].filter(Boolean).join(", ")}</span>}
          </div>
        </>
      );
    }
    if (resource === "locations") {
      return (
        <>
          <p className="font-medium truncate">{it.name || "Unnamed location"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            {(it.address || it.city) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[it.address, it.city].filter(Boolean).join(", ")}</span>}
          </div>
        </>
      );
    }
    if (resource === "clients") {
      return (
        <>
          <p className="font-medium truncate">{it.name || "Unnamed client"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            {it.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{it.company_name}</span>}
            {it.contact_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{it.contact_name}</span>}
            {it.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{it.contact_email}</span>}
            {it.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{it.contact_phone}</span>}
          </div>
        </>
      );
    }
    // workers
    return (
      <>
        <p className="font-medium truncate">{it.name || "Unnamed worker"}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
          {it.role && <span className="flex items-center gap-1"><User className="h-3 w-3" />{it.role}</span>}
          {it.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{it.email}</span>}
          {it.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{it.phone}</span>}
          {it.areas && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{it.areas}</span>}
        </div>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription>{cfg.description}</DialogDescription>
        </DialogHeader>

        {mode === "contacts" && (
          <div className="flex gap-2">
            <Button size="sm" variant={subMode === "clients" ? "default" : "outline"} onClick={() => setSubMode("clients")} className={cn(subMode !== "clients" && "bg-transparent")}>Clients</Button>
            <Button size="sm" variant={subMode === "workers" ? "default" : "outline"} onClick={() => setSubMode("workers")} className={cn(subMode !== "workers" && "bg-transparent")}>Workers</Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="max-h-[55vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading from Roosted...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No records found in Roosted.</p>
            </div>
          ) : (
            filtered.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                <div className="min-w-0">{renderRow(it)}</div>
                <Button size="sm" onClick={() => handleImport(it)} disabled={importingId !== null} className="gap-1.5 shrink-0">
                  {importingId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Import
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}