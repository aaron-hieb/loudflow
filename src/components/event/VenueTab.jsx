import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Clock, Car, Wifi, Users, Pencil, CloudSun } from "lucide-react";
import moment from "moment";

const WMO_CODES = {
  0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
  80: "Rain Showers", 81: "Showers", 82: "Heavy Showers", 95: "Thunderstorm", 99: "Hail Storm"
};

const WMO_EMOJI = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️", 45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌧", 55: "🌧", 61: "🌦", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "❄️", 75: "❄️", 80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈", 99: "⛈"
};

async function fetchWeather(city, startDate, endDate) {
  // Geocode city
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);
  const geoData = await geoRes.json();
  if (!geoData.results?.length) return null;
  const { latitude, longitude } = geoData.results[0];

  // Clamp dates to forecast window (Open-Meteo supports up to 16 days ahead)
  const today = moment().format("YYYY-MM-DD");
  const maxForecast = moment().add(16, "days").format("YYYY-MM-DD");
  const start = startDate < today ? today : startDate;
  const end = endDate > maxForecast ? maxForecast : endDate;
  if (start > end) return null;

  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&timezone=auto&start_date=${start}&end_date=${end}&forecast_days=16`
  );
  const wxData = await wxRes.json();
  if (!wxData.daily?.time?.length) return null;

  return wxData.daily.time.map((date, i) => ({
    date,
    code: wxData.daily.weathercode[i],
    high: Math.round(wxData.daily.temperature_2m_max[i]),
    low: Math.round(wxData.daily.temperature_2m_min[i]),
    precip: wxData.daily.precipitation_sum[i],
  }));
}

export default function VenueTab({ eventId, isAdmin, startDate, endDate, city }) {
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    venue_name: "", address: "", city: "", state: "", zip: "", country: "",
    capacity: "", contact_name: "", contact_phone: "", contact_email: "",
    load_in_time: "", load_out_time: "", parking_info: "", wifi_info: "", notes: ""
  });

  useEffect(() => {
    load();
  }, [eventId]);

  useEffect(() => {
    const weatherCity = city || venue?.city;
    if (!weatherCity || !startDate) return;
    setWeatherLoading(true);
    setWeather(null);
    fetchWeather(weatherCity, startDate, endDate || startDate)
      .then(setWeather)
      .finally(() => setWeatherLoading(false));
  }, [city, venue, startDate, endDate]);

  async function load() {
    const results = await base44.entities.VenueInfo.filter({ event_id: eventId });
    if (results.length > 0) {
      setVenue(results[0]);
      setForm({ ...results[0] });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form, event_id: eventId };
    if (payload.capacity) payload.capacity = Number(payload.capacity);
    else delete payload.capacity;
    if (venue) {
      await base44.entities.VenueInfo.update(venue.id, payload);
    } else {
      await base44.entities.VenueInfo.create(payload);
    }
    setSaving(false);
    setEditing(false);
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Venue Information</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); if (venue) setForm({ ...venue }); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Venue Name</Label>
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
      </div>
    );
  }

  const weatherCity = city || venue?.city;
  const weatherCard = weatherCity && startDate ? (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CloudSun className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Weather Forecast — {weatherCity}</p>
      </div>
      {weatherLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          Loading forecast…
        </div>
      ) : weather?.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {weather.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1 min-w-[64px] bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">{moment(day.date).format("ddd M/D")}</p>
              <span className="text-2xl">{WMO_EMOJI[day.code] ?? "🌡"}</span>
              <p className="text-xs font-semibold">{day.high}°</p>
              <p className="text-xs text-muted-foreground">{day.low}°</p>
              <p className="text-xs text-center text-muted-foreground leading-tight">{WMO_CODES[day.code] ?? ""}</p>
              {day.precip > 0 && <p className="text-xs text-blue-500">💧{day.precip}"</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Forecast not available — Open-Meteo only supports up to 16 days ahead.</p>
      )}
    </div>
  ) : null;

  if (!venue || !venue.venue_name) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No venue information added yet</p>
          {isAdmin && (
            <Button onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Add Venue Info
            </Button>
          )}
        </div>
        {weatherCard}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{venue.venue_name}</h3>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(venue.address || venue.city) && (() => {
          const mapsQuery = encodeURIComponent([venue.address, venue.city, venue.state, venue.zip, venue.country].filter(Boolean).join(" "));
          const mapsUrl = `https://maps.google.com/?q=${mapsQuery}`;
          return (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-card border border-border rounded-xl p-4 flex gap-3 hover:border-primary transition-colors cursor-pointer">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Address <span className="text-primary">(tap to open maps)</span></p>
                  {venue.address && <p className="text-sm font-medium">{venue.address}</p>}
                  <p className="text-sm text-muted-foreground">
                    {[venue.city, venue.state, venue.zip, venue.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            </a>
          );
        })()}

        {venue.capacity && (
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Capacity</p>
              <p className="text-sm font-medium">{Number(venue.capacity).toLocaleString()}</p>
            </div>
          </div>
        )}

        {(venue.load_in_time || venue.load_out_time) && (
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Load Times</p>
              {venue.load_in_time && <p className="text-sm font-medium">In: {venue.load_in_time}</p>}
              {venue.load_out_time && <p className="text-sm font-medium">Out: {venue.load_out_time}</p>}
            </div>
          </div>
        )}

        {(venue.contact_name || venue.contact_phone || venue.contact_email) && (
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Venue Contact</p>
              {venue.contact_name && <p className="text-sm font-medium">{venue.contact_name}</p>}
              {venue.contact_phone && (
                <a href={`tel:${venue.contact_phone}`} className="text-sm text-primary hover:underline block">{venue.contact_phone}</a>
              )}
              {venue.contact_email && (
                <a href={`mailto:${venue.contact_email}`} className="text-sm text-primary hover:underline block">{venue.contact_email}</a>
              )}
            </div>
          </div>
        )}

        {venue.wifi_info && (
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <Wifi className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">WiFi</p>
              <p className="text-sm font-medium">{venue.wifi_info}</p>
            </div>
          </div>
        )}

        {venue.parking_info && (
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <Car className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Parking</p>
              <p className="text-sm font-medium whitespace-pre-line">{venue.parking_info}</p>
            </div>
          </div>
        )}
      </div>

      {venue.notes && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2">Notes</p>
          <p className="text-sm whitespace-pre-line">{venue.notes}</p>
        </div>
      )}

      {weatherCard}
    </div>
  );
}