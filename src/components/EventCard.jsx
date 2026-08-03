import { Link } from "react-router-dom";
import { MapPin, CalendarDays, ChevronRight, Copy } from "lucide-react";
import StatusBadge from "./StatusBadge";
import moment from "moment";

export default function EventCard({ event, onCopy }) {
  return (
    <div className="group bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
      <Link to={`/events/${event.id}`} className="block p-5">
        <div className="flex items-start justify-between mb-3">
          <StatusBadge status={event.status} />
          {!onCopy && (
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
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
      {onCopy && (
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => onCopy(event)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> Copy to new event
          </button>
        </div>
      )}
    </div>
  );
}