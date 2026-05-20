import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, CalendarDays, Plane, BedDouble, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "../components/EventCard";
import moment from "moment";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ flights: 0, hotels: 0, gear: 0, contacts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [evts, flights, hotels, gear, contacts] = await Promise.all([
        base44.entities.Event.list("-start_date", 50),
        base44.entities.Flight.list("-created_date", 100),
        base44.entities.Hotel.list("-created_date", 100),
        base44.entities.GearItem.list("-created_date", 100),
        base44.entities.Contact.list("-created_date", 100),
      ]);
      setEvents(evts);
      setStats({ flights: flights.length, hotels: hotels.length, gear: gear.length, contacts: contacts.length });
      setLoading(false);
    }
    load();
  }, []);

  const upcoming = events.filter(e => 
    e.status !== "completed" && e.status !== "cancelled" && 
    moment(e.start_date).isSameOrAfter(moment(), "day")
  ).slice(0, 6);

  const statCards = [
    { label: "Active Events", value: events.filter(e => e.status !== "completed" && e.status !== "cancelled").length, icon: CalendarDays, color: "text-primary" },
    { label: "Flights", value: stats.flights, icon: Plane, color: "text-blue-500" },
    { label: "Hotels", value: stats.hotels, icon: BedDouble, color: "text-emerald-500" },
    { label: "Gear Items", value: stats.gear, icon: Package, color: "text-violet-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your production overview</p>
        </div>
        <Link to="/events">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Events</h2>
          <Link to="/events" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No upcoming events</p>
            <Link to="/events">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create your first event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}