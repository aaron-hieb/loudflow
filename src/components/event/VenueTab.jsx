import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Clock, Car, Wifi, Users, Pencil, CloudSun, Wind, Droplets, Eye, Thermometer, X, Library } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

async function fetchHourlyWeather(city, date) {
  const cityName = city.split(",")[0].trim();
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&format=json`);
  const geoData = await geoRes.json();
  if (!geoData.results?.length) return [];
  const { latitude, longitude } = geoData.results[0];

  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m,relativehumidity_2m,visibility&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&start_date=${date}&end_date=${date}`
  );
  const wxData = await wxRes.json();
  if (!wxData.hourly?.time?.length) return [];

  return wxData.hourly.time.map((time, i) => ({
    time,
    hour: moment(time).format("h A"),
    code: wxData.hourly.weathercode[i],
    temp: Math.round(wxData.hourly.temperature_2m[i]),
    precipProb: wxData.hourly.precipitation_probability[i],
    wind: Math.round(wxData.hourly.windspeed_10m[i]),
    humidity: wxData.hourly.relativehumidity_2m[i],
    visibility: wxData.hourly.visibility ? Math.round(wxData.hourly.visibility[i] / 5280) : null,
  }));
}

async function fetchWeather(city, startDate, endDate) {
  // Geocode city — use just the city name part before any comma for better results
  const cityName = city.split(",")[0].trim();
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&format=json`);
  const geoData = await geoRes.json();
  if (!geoData.results?.length) return [];
  const { latitude, longitude } = geoData.results[0];

  // Clamp dates to forecast window (Open-Meteo supports up to 16 days ahead)
  const today = moment().format("YYYY-MM-DD");
  const maxForecast = moment().add(16, "days").format("YYYY-MM-DD");
  const start = startDate < today ? today : startDate;
  const end = endDate > maxForecast ? maxForecast : endDate;
  if (start > end) return [];

  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&timezone=auto&start_date=${start}&end_date=${end}`
  );
  const wxData = await wxRes.json();
  if (!wxData.daily?.time?.length) return [];

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
  const [selectedDay, setSelectedDay] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [libraryVenues, setLibraryVenues] = useState([]);
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

  async function openImport() {
    const results = await base44.entities.VenueLibrary.list("-created_date");
    setLibraryVenues(results);
    setImportOpen(true);
  }

  async function handleImport(libVenue) {
    const { id, created_date, updated_date, created_by, ...fields } = libVenue;
    const payload = { ...fields, event_id: eventId };
    if (payload.capacity) payload.capacity = Number(payload.capacity);
    if (venue) {
      await base44.entities.VenueInfo.update(venue.id, payload);
    } else {
      await base44.entities.VenueInfo.create(payload);
    }
    setImportOpen(false);
    load();
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
            {isAdmin && <Button variant="outline" size="sm" onClick={openImport} className="gap-1.5"><Library className="h-3.5 w-3.5" /> Import</Button>}
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

  async function handleDayClick(day) {
    const weatherCity = city || venue?.city;
    setSelectedDay(day);
    setHourlyData(null);
    setHourlyLoading(true);
    const data = await fetchHourlyWeather(weatherCity, day.date);
    setHourlyData(data);
    setHourlyLoading(false);
  }

  const weatherCity = city || venue?.city;
  const weatherCard = weatherCity && startDate ? (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CloudSun className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Weather Forecast — {weatherCity}</p>
      </div>
      {weatherLoading || weather === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          Loading forecast…
        </div>
      ) : weather?.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {weather.map((day) => (
            <button
              key={day.date}
              onClick={() => handleDayClick(day)}
              className="flex flex-col items-center gap-1 min-w-[64px] bg-muted/40 hover:bg-muted rounded-lg p-2 transition-colors cursor-pointer border border-transparent hover:border-primary/30"
            >
              <p className="text-xs text-muted-foreground">{moment(day.date).format("ddd M/D")}</p>
              <span className="text-2xl">{WMO_EMOJI[day.code] ?? "🌡"}</span>
              <p className="text-xs font-semibold">{day.high}°</p>
              <p className="text-xs text-muted-foreground">{day.low}°</p>
              <p className="text-xs text-center text-muted-foreground leading-tight">{WMO_CODES[day.code] ?? ""}</p>
              {day.precip > 0 && <p className="text-xs text-blue-500">💧{day.precip}"</p>}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Forecast not available — Open-Meteo only supports up to 16 days ahead.</p>
      )}
    </div>
  ) : null;

  const dayDetailDialog = (
    <Dialog open={!!selectedDay} onOpenChange={(o) => { if (!o) setSelectedDay(null); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        {selectedDay && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{WMO_EMOJI[selectedDay.code] ?? "🌡"}</span>
                <div>
                  <div>{moment(selectedDay.date).format("dddd, MMMM D")}</div>
                  <div className="text-sm font-normal text-muted-foreground">{WMO_CODES[selectedDay.code]} · {weatherCity}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">High / Low</p>
                  <p className="text-sm font-semibold">{selectedDay.high}° / {selectedDay.low}°F</p>
                </div>
              </div>
              {selectedDay.precip > 0 && (
                <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Precipitation</p>
                    <p className="text-sm font-semibold">{selectedDay.precip}"</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Hourly Forecast</p>
              {hourlyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                  Loading hourly data…
                </div>
              ) : hourlyData?.length ? (
                <div className="space-y-1.5">
                  {hourlyData.map((h) => (
                    <div key={h.time} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 text-sm">
                      <span className="w-14 text-xs text-muted-foreground shrink-0">{h.hour}</span>
                      <span className="text-base">{WMO_EMOJI[h.code] ?? "🌡"}</span>
                      <span className="font-medium w-10 shrink-0">{h.temp}°F</span>
                      <div className="flex items-center gap-1 text-xs text-blue-500 w-10 shrink-0">
                        <Droplets className="h-3 w-3" />{h.precipProb}%
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wind className="h-3 w-3" />{h.wind} mph
                      </div>
                      {h.humidity != null && (
                        <div className="text-xs text-muted-foreground ml-auto">{h.humidity}% humidity</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hourly data available.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  if (!venue || !venue.venue_name) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No venue information added yet</p>
          {isAdmin && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={openImport} className="gap-2">
                <Library className="h-4 w-4" /> Import from Library
              </Button>
              <Button onClick={() => setEditing(true)} className="gap-2">
                <Pencil className="h-4 w-4" /> Add Venue Info
              </Button>
            </div>
          )}
        </div>
        {weatherCard}
        {dayDetailDialog}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import from Venue Library</DialogTitle>
            </DialogHeader>
            {libraryVenues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No venues in your library yet. Add some from the Venues page.</p>
            ) : (
              <div className="space-y-2 mt-2">
                {libraryVenues.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleImport(v)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
                  >
                    <p className="font-medium text-sm">{v.venue_name}</p>
                    {(v.city || v.state) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[v.address, v.city, v.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {v.capacity && <p className="text-xs text-muted-foreground">Capacity: {Number(v.capacity).toLocaleString()}</p>}
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{venue.venue_name}</h3>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openImport} className="gap-1.5">
              <Library className="h-3.5 w-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
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
      {dayDetailDialog}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Venue Library</DialogTitle>
          </DialogHeader>
          {libraryVenues.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No venues in your library yet. Add some from the Venues page.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {libraryVenues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleImport(v)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
                >
                  <p className="font-medium text-sm">{v.venue_name}</p>
                  {(v.city || v.state) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[v.address, v.city, v.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {v.capacity && <p className="text-xs text-muted-foreground">Capacity: {Number(v.capacity).toLocaleString()}</p>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}