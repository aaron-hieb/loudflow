import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const PROD_BASE = "https://api.roostedhr.com/api/1_12";
const SANDBOX_BASE = "https://sandbox.roostedhr.com/api/1_12";

async function roostedGet(base, headers, path) {
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Roosted API error (${res.status})`, details: text }, { status: 502 });
  }
  return res.json();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";
    const resource = body.resource || "events";
    const base = body.sandbox === true ? SANDBOX_BASE : PROD_BASE;
    const apiKey = secrets.get("ROOSTED_API_KEY");
    if (!apiKey) return Response.json({ error: 'Roosted API key not configured' }, { status: 500 });

    const headers = { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' };

    // ---------- LIST ----------
    if (action === "list") {
      let items = [];
      let total = 0;

      if (resource === "events") {
        const page = body.page || 1;
        const perPage = body.items_per_page || 100;
        const data = await roostedGet(base, headers, `/events?page=${page}&items_per_page=${perPage}`);
        if (data.error) return data;
        items = (data.events || []).map((e) => ({
          id: e.id, name: e.name, date: e.date,
          venue: e.location ? e.location.location : "",
          city: e.location ? e.location.addy_city : "",
        }));
        items.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
        total = data.total_count || items.length;
      } else if (resource === "locations") {
        const data = await roostedGet(base, headers, `/locations?page=1&items_per_page=100`);
        if (data.error) return data;
        items = (data.locations || []).map((l) => ({
          id: l.id, name: l.location || "", address: l.addy_street_number || "",
          city: l.addy_city || "", zip: l.addy_zip || "", comments: l.location_comments || "",
        }));
        total = data.total || items.length;
      } else if (resource === "clients") {
        const data = await roostedGet(base, headers, `/clients?page=1&items_per_page=100`);
        if (data.error) return data;
        items = (data.clients || []).map((c) => ({
          id: c.id, name: c.client_name || c.company_name || "",
          contact_name: c.client_contact_name || "", contact_phone: c.client_contact_phone || "",
          contact_email: c.client_contact_email || "", contact_title: c.client_contact_title || "",
          company_name: c.company_name || "", city: c.client_city || "", state: c.client_state || "",
          address: c.client_address || "", pending: c.pending === true,
        }));
        total = data.total_count || items.length;
      } else if (resource === "workers") {
        const data = await roostedGet(base, headers, `/workers?workerStatus=1`);
        if (data.error) return data;
        items = (data.workers || []).map((w) => ({
          id: w.id, name: w.name_first || "", email: w.email || "", phone: w.phone || "",
          role: (w.skillsets && w.skillsets[0]) ? w.skillsets[0].role_title : "",
          areas: (w.areas || []).map((a) => a.name).join(", "),
        }));
        total = items.length;
      } else {
        return Response.json({ error: 'Unknown resource' }, { status: 400 });
      }

      return Response.json({ items, total });
    }

    // ---------- IMPORT ----------
    if (action === "import") {
      const roostedId = body.roosted_id || body.roosted_event_id;
      if (!roostedId) return Response.json({ error: 'roosted_id required' }, { status: 400 });

      if (resource === "events") {
        const data = await roostedGet(base, headers, `/events?page=1&items_per_page=100`);
        if (data.error) return data;
        const found = (data.events || []).find((e) => String(e.id) === String(roostedId) || String(e.event_id) === String(roostedId));
        if (!found) return Response.json({ error: 'Roosted event not found' }, { status: 404 });
        const today = new Date().toISOString().split("T")[0];
        const item = await base44.entities.Event.create({
          name: found.name || "Untitled Event",
          client: "", venue: found.location ? found.location.location : "",
          city: found.location ? found.location.addy_city : "",
          start_date: found.date || today, status: "planning",
          notes: `Imported from Roosted. Roosted Event ID: ${found.event_id || found.id}. Client ID: ${found.client_id || ""}.`,
        });
        return Response.json({ item });
      }

      if (resource === "locations") {
        const data = await roostedGet(base, headers, `/locations?page=1&items_per_page=100`);
        if (data.error) return data;
        const found = (data.locations || []).find((l) => String(l.id) === String(roostedId));
        if (!found) return Response.json({ error: 'Roosted location not found' }, { status: 404 });
        const item = await base44.entities.VenueLibrary.create({
          venue_name: found.location || "Untitled Venue",
          address: found.addy_street_number || "", city: found.addy_city || "", zip: found.addy_zip || "",
          notes: [found.location_comments, "Imported from Roosted."].filter(Boolean).join(" "),
        });
        return Response.json({ item });
      }

      if (resource === "clients") {
        const data = await roostedGet(base, headers, `/clients?page=1&items_per_page=100`);
        if (data.error) return data;
        const found = (data.clients || []).find((c) => String(c.id) === String(roostedId));
        if (!found) return Response.json({ error: 'Roosted client not found' }, { status: 404 });
        const item = await base44.entities.Contact.create({
          name: found.client_contact_name || found.client_name || found.company_name || "Unknown",
          company: found.company_name || found.client_name || "",
          role: found.client_contact_title || "",
          email: found.client_contact_email || "", phone: found.client_contact_phone || "",
          category: "client",
          notes: [found.client_address, [found.client_city, found.client_state].filter(Boolean).join(", "), found.client_postal_code].filter(Boolean).join(" ") + " (Imported from Roosted)",
        });
        return Response.json({ item });
      }

      if (resource === "workers") {
        const data = await roostedGet(base, headers, `/workers?workerStatus=1`);
        if (data.error) return data;
        const found = (data.workers || []).find((w) => String(w.id) === String(roostedId));
        if (!found) return Response.json({ error: 'Roosted worker not found' }, { status: 404 });
        const item = await base44.entities.Contact.create({
          name: found.name_first || "Unknown",
          role: (found.skillsets && found.skillsets[0]) ? found.skillsets[0].role_title : "",
          email: found.email || "", phone: found.phone || "",
          category: "crew",
          notes: [(found.areas || []).map((a) => a.name).join(", "), "Imported from Roosted."].filter(Boolean).join(" — "),
        });
        return Response.json({ item });
      }

      return Response.json({ error: 'Unknown resource' }, { status: 400 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}