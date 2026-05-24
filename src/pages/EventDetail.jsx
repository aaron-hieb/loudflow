import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CalendarDays, MapPin, DollarSign, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import StatusBadge from "../components/StatusBadge";
import ScheduleTab from "../components/event/ScheduleTab";
import TravelTab from "../components/event/TravelTab";
import HotelTab from "../components/event/HotelTab";
import GearTab from "../components/event/GearTab";
import EventContactsTab from "../components/event/EventContactsTab";
import FilesTab from "../components/event/FilesTab";
import CrewTab from "../components/event/CrewTab";
import VenueTab from "../components/event/VenueTab";
import moment from "moment";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [event, setEvent] = useState(null);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [gearItems, setGearItems] = useState([]);
  const [eventFiles, setEventFiles] = useState([]);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, [eventId]);

  async function loadAll() {
    const [evt, schedule, fl, ht, gear, files, crewList] = await Promise.all([
      base44.entities.Event.get(eventId),
      base44.entities.ScheduleItem.filter({ event_id: eventId }),
      base44.entities.Flight.filter({ event_id: eventId }),
      base44.entities.Hotel.filter({ event_id: eventId }),
      base44.entities.GearItem.filter({ event_id: eventId }),
      base44.entities.EventFile.filter({ event_id: eventId }),
      base44.entities.CrewMember.filter({ event_id: eventId }),
    ]);
    setEvent(evt);
    setScheduleItems(schedule);
    setFlights(fl);
    setHotels(ht);
    setGearItems(gear);
    setEventFiles(files);
    setCrew(crewList);
    setEditForm({
      name: evt.name || "", client: evt.client || "", venue: evt.venue || "",
      city: evt.city || "", start_date: evt.start_date || "", end_date: evt.end_date || "",
      status: evt.status || "planning", budget: evt.budget || "", notes: evt.notes || "",
    });
    setLoading(false);
  }

  async function handleUpdate() {
    setSaving(true);
    const payload = { ...editForm };
    if (payload.budget) payload.budget = Number(payload.budget);
    else delete payload.budget;
    if (!payload.end_date) delete payload.end_date;
    await base44.entities.Event.update(eventId, payload);
    setShowEdit(false);
    setSaving(false);
    loadAll();
  }

  async function handleDelete() {
    await base44.entities.Event.delete(eventId);
    navigate("/events");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-12 text-muted-foreground">Event not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
              <StatusBadge status={event.status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {event.client && <span>{event.client}</span>}
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {moment(event.start_date).format("MMM D, YYYY")}
                  {event.end_date && ` – ${moment(event.end_date).format("MMM D, YYYY")}`}
                </span>
              )}
              {event.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue}{event.city ? `, ${event.city}` : ""}
                </span>
              )}
              {event.budget && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {event.budget.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this event and cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="travel">Flights</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="gear">Gear</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="venue">Venue</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-6">
          <ScheduleTab eventId={eventId} items={scheduleItems} onRefresh={loadAll} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="travel" className="mt-6">
          <TravelTab eventId={eventId} flights={flights} onRefresh={loadAll} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="hotels" className="mt-6">
          <HotelTab eventId={eventId} hotels={hotels} onRefresh={loadAll} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="gear" className="mt-6">
          <GearTab eventId={eventId} items={gearItems} onRefresh={loadAll} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-6">
          <EventContactsTab eventId={eventId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="crew" className="mt-6">
          <CrewTab eventId={eventId} crew={crew} onRefresh={loadAll} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="venue" className="mt-6">
          <VenueTab eventId={eventId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="files" className="mt-6">
          <FilesTab eventId={eventId} files={eventFiles} onRefresh={loadAll} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Event Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Client</Label>
                <Input value={editForm.client} onChange={(e) => setEditForm({ ...editForm, client: e.target.value })} />
              </div>
              <div>
                <Label>Venue</Label>
                <Input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Budget</Label>
                <Input type="number" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}