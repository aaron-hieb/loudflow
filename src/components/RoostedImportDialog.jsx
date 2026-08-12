import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, Calendar, MapPin, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function RoostedImportDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setEvents([]);
    base44.functions.invoke("roostedEvents", { action: "list" })
      .then((res) => setEvents(res.data.events || []))
      .catch(() => toast({ title: "Failed to load Roosted events", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = events.filter((e) =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.city?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleImport(ev) {
    setImportingId(ev.id);
    try {
      const res = await base44.functions.invoke("roostedEvents", { action: "import", roosted_event_id: ev.id });
      toast({ title: "Event imported", description: "Review and complete the details." });
      onOpenChange(false);
      navigate(`/events/${res.data.event.id}`);
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Roosted</DialogTitle>
          <DialogDescription>Select a Roosted event to create a starting point in FlowDaddy.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Roosted events..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading events from Roosted...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No events found in Roosted.</p>
            </div>
          ) : (
            filtered.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium truncate">{ev.name || "Untitled"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    {ev.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{ev.date}</span>}
                    {(ev.venue || ev.city) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[ev.venue, ev.city].filter(Boolean).join(", ")}</span>}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleImport(ev)} disabled={importingId !== null} className="gap-1.5 shrink-0">
                  {importingId === ev.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
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