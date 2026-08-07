import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import EventCard from "../components/EventCard";

export default function PastEvents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    async function load() {
      const all = await base44.entities.Event.list("-end_date", 200);
      const today = new Date().toISOString().split("T")[0];
      const data = all.filter((e) => e.status === "completed" || (e.end_date && e.end_date < today));
      setEvents(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = events.filter((e) =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.client?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = async (event) => {
    setCopying(true);
    try {
      const { id, created_date, updated_date, created_by_id, start_date, end_date, status, ...rest } = event;
      const today = new Date().toISOString().split("T")[0];
      const copy = await base44.entities.Event.create({
        ...rest,
        name: `Copy of ${event.name}`,
        status: "planning",
        start_date: today,
        end_date: "",
      });

      // Duplicate all template-worthy child content onto the new event
      const stripBuiltins = (o) => {
        const { id, created_date, updated_date, created_by_id, ...data } = o;
        return data;
      };
      const [schedule, flights, hotels, gear, files, crew, venueInfo, eventContacts] = await Promise.all([
        base44.entities.ScheduleItem.filter({ event_id: id }),
        base44.entities.Flight.filter({ event_id: id }),
        base44.entities.Hotel.filter({ event_id: id }),
        base44.entities.GearItem.filter({ event_id: id }),
        base44.entities.EventFile.filter({ event_id: id }),
        base44.entities.CrewMember.filter({ event_id: id }),
        base44.entities.VenueInfo.filter({ event_id: id }),
        base44.entities.EventContact.filter({ event_id: id }),
      ]);

      const tasks = [];
      if (schedule.length) tasks.push(base44.entities.ScheduleItem.bulkCreate(schedule.map((i) => ({ ...stripBuiltins(i), event_id: copy.id, date: "" }))));
      if (flights.length) tasks.push(base44.entities.Flight.bulkCreate(flights.map((i) => ({ ...stripBuiltins(i), event_id: copy.id, departure_date: "", arrival_date: i.arrival_date || "" }))));
      if (hotels.length) tasks.push(base44.entities.Hotel.bulkCreate(hotels.map((i) => ({ ...stripBuiltins(i), event_id: copy.id, check_in: "", check_out: "" }))));
      if (gear.length) tasks.push(base44.entities.GearItem.bulkCreate(gear.map((i) => ({ ...stripBuiltins(i), event_id: copy.id, status: "in_shop" }))));
      if (files.length) tasks.push(base44.entities.EventFile.bulkCreate(files.map((i) => stripBuiltins(i)).map((i) => ({ ...i, event_id: copy.id }))));
      if (crew.length) tasks.push(base44.entities.CrewMember.bulkCreate(crew.map((i) => ({ ...stripBuiltins(i), event_id: copy.id, status: "pending" }))));
      if (venueInfo.length) tasks.push(base44.entities.VenueInfo.bulkCreate(venueInfo.map((i) => ({ ...stripBuiltins(i), event_id: copy.id }))));
      if (eventContacts.length) tasks.push(base44.entities.EventContact.bulkCreate(eventContacts.map((i) => ({ ...stripBuiltins(i), event_id: copy.id }))));
      await Promise.all(tasks);

      toast({ title: "Event copied", description: "Gear, schedule, crew, and other details were copied over — update the dates and details." });
      navigate(`/events/${copy.id}`);
    } catch (e) {
      toast({ title: "Failed to copy event", variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Past Events</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Completed events archive</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search past events..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No completed events yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onCopy={copying ? undefined : handleCopy} />
          ))}
        </div>
      )}
    </div>
  );
}