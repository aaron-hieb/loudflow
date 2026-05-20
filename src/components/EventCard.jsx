import { Link } from "react-router-dom";
import { MapPin, CalendarDays, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import moment from "moment";

export default function EventCard({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group block bg-card rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <StatusBadge status={event.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
        {event.name}
      </h3>
      {event.client && (
        <p className="text-sm text-muted-foreground mb-3">{event.client}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {moment(event.start_date).format("MMM D")}
          {event.end_date && ` – ${moment(event.end_date).format("MMM D")}`}
        </span>
        {event.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.venue}
          </span>
        )}
      </div>
    </Link>
  );
}