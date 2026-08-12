import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const PROD_BASE = "https://api.roostedhr.com/api/1_12";
const SANDBOX_BASE = "https://sandbox.roostedhr.com/api/1_12";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";
    const base = body.sandbox === true ? SANDBOX_BASE : PROD_BASE;
    const apiKey = secrets.get("ROOSTED_API_KEY");
    if (!apiKey) return Response.json({ error: 'Roosted API key not configured' }, { status: 500 });

    const headers = { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' };

    if (action === "list") {
      const page = body.page || 1;
      const perPage = body.items_per_page || 100;
      const url = `${base}/events?page=${page}&items_per_page=${perPage}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text();
        return Response.json({ error: `Roosted API error (${res.status})`, details: text }, { status: 502 });
      }
      const data = await res.json();
      const events = (data.events || []).map((e) => ({
        id: e.id,
        event_id: e.event_id,
        name: e.name,
        date: e.date,
        client_id: e.client_id,
        venue: e.location ? e.location.location : "",
        city: e.location ? e.location.addy_city : "",
        areas: (e.areas || []).map((a) => a.name).join(", "),
      }));
      return Response.json({ events, total_count: data.total_count || events.length });
    }

    if (action === "import") {
      const roostedId = body.roosted_event_id;
      if (!roostedId) return Response.json({ error: 'roosted_event_id required' }, { status: 400 });
      const url = `${base}/events?page=1&items_per_page=100`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text();
        return Response.json({ error: `Roosted API error (${res.status})`, details: text }, { status: 502 });
      }
      const data = await res.json();
      const found = (data.events || []).find((e) => String(e.id) === String(roostedId) || String(e.event_id) === String(roostedId));
      if (!found) return Response.json({ error: 'Roosted event not found' }, { status: 404 });

      const today = new Date().toISOString().split("T")[0];
      const newEvent = await base44.entities.Event.create({
        name: found.name || "Untitled Event",
        client: "",
        venue: found.location ? found.location.location : "",
        city: found.location ? found.location.addy_city : "",
        start_date: found.date || today,
        status: "planning",
        notes: `Imported from Roosted. Roosted Event ID: ${found.event_id || found.id}. Client ID: ${found.client_id || ""}.`,
      });
      return Response.json({ event: newEvent });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}