import { useState, useEffect } from "react";
import { Wind, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

// Open-Meteo: lightning_potential is in hourly. WMO codes 95/96/99 = thunderstorm.
const THUNDER_CODES = new Set([95, 96, 99]);

async function fetchWindLightning(city) {
  const cityName = city.split(",")[0].trim();
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&format=json`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error("City not found");
  const { latitude, longitude } = geoData.results[0];

  const now = moment().format("YYYY-MM-DD");
  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=windspeed_10m,windgusts_10m,weathercode,cape&windspeed_unit=mph&timezone=auto&start_date=${now}&end_date=${now}`
  );
  const wx = await wxRes.json();
  if (!wx.hourly?.time?.length) throw new Error("No data");

  const currentHour = moment().format("YYYY-MM-DDTHH:00");
  const idx = wx.hourly.time.findIndex((t) => t === currentHour);
  const i = idx >= 0 ? idx : 0;

  // Look ahead 3 hours for lightning risk
  const lookahead = Math.min(i + 3, wx.hourly.time.length - 1);
  let lightningRisk = "Low";
  let lightningColor = "text-green-600";
  let lightningBg = "bg-green-50 border-green-200";

  for (let j = i; j <= lookahead; j++) {
    const code = wx.hourly.weathercode[j];
    const cape = wx.hourly.cape?.[j] ?? 0;
    if (THUNDER_CODES.has(code)) {
      lightningRisk = "Active Storms";
      lightningColor = "text-red-600";
      lightningBg = "bg-red-50 border-red-200";
      break;
    } else if (cape > 1000) {
      lightningRisk = "High";
      lightningColor = "text-orange-500";
      lightningBg = "bg-orange-50 border-orange-200";
    } else if (cape > 400 && lightningRisk !== "High") {
      lightningRisk = "Moderate";
      lightningColor = "text-yellow-600";
      lightningBg = "bg-yellow-50 border-yellow-200";
    }
  }

  const wind = Math.round(wx.hourly.windspeed_10m[i]);
  const gusts = Math.round(wx.hourly.windgusts_10m?.[i] ?? wind);

  let windLevel = "Calm";
  let windColor = "text-green-600";
  let windBg = "bg-green-50 border-green-200";
  if (wind >= 40) { windLevel = "Dangerous"; windColor = "text-red-600"; windBg = "bg-red-50 border-red-200"; }
  else if (wind >= 25) { windLevel = "High"; windColor = "text-orange-500"; windBg = "bg-orange-50 border-orange-200"; }
  else if (wind >= 15) { windLevel = "Breezy"; windColor = "text-yellow-600"; windBg = "bg-yellow-50 border-yellow-200"; }
  else if (wind >= 8) { windLevel = "Light"; windColor = "text-blue-500"; windBg = "bg-blue-50 border-blue-200"; }

  return { wind, gusts, windLevel, windColor, windBg, lightningRisk, lightningColor, lightningBg, city: geoData.results[0].name };
}

export default function WindLightningWidget({ city }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    if (!city) return;
    setLoading(true);
    setError(null);
    fetchWindLightning(city)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [city]);

  if (!city) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          ⚡ Wind &amp; Lightning — {city}
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          Fetching conditions…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-2 gap-3">
          {/* Wind */}
          <div className={`rounded-lg border p-3 ${data.windBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Wind className={`h-4 w-4 ${data.windColor}`} />
              <span className="text-xs font-medium text-muted-foreground">Wind</span>
            </div>
            <p className={`text-xl font-bold ${data.windColor}`}>{data.wind} mph</p>
            <p className="text-xs text-muted-foreground">Gusts: {data.gusts} mph</p>
            <p className={`text-xs font-semibold mt-1 ${data.windColor}`}>{data.windLevel}</p>
          </div>

          {/* Lightning */}
          <div className={`rounded-lg border p-3 ${data.lightningBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className={`h-4 w-4 ${data.lightningColor}`} />
              <span className="text-xs font-medium text-muted-foreground">Lightning Risk</span>
            </div>
            <p className={`text-xl font-bold ${data.lightningColor}`}>{data.lightningRisk}</p>
            <p className="text-xs text-muted-foreground">Next 3 hours</p>
            {data.lightningRisk === "Active Storms" && (
              <p className="text-xs font-semibold text-red-600 mt-1">⚠️ Seek shelter!</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2 opacity-60">Current conditions · Open-Meteo</p>
    </div>
  );
}