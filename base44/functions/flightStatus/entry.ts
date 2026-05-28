import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { flight_number } = await req.json();
    if (!flight_number) return Response.json({ error: 'flight_number is required' }, { status: 400 });

    const apiKey = Deno.env.get('AVIATIONSTACK_API_KEY');
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(flight_number.trim())}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      return Response.json({ found: false });
    }

    const f = data.data[0];
    return Response.json({
      found: true,
      flight_status: f.flight_status,
      departure: {
        airport: f.departure?.airport,
        iata: f.departure?.iata,
        scheduled: f.departure?.scheduled,
        estimated: f.departure?.estimated,
        actual: f.departure?.actual,
        delay: f.departure?.delay,
        terminal: f.departure?.terminal,
        gate: f.departure?.gate,
      },
      arrival: {
        airport: f.arrival?.airport,
        iata: f.arrival?.iata,
        scheduled: f.arrival?.scheduled,
        estimated: f.arrival?.estimated,
        actual: f.arrival?.actual,
        delay: f.arrival?.delay,
        terminal: f.arrival?.terminal,
        gate: f.arrival?.gate,
      },
      airline: f.airline?.name,
      flight_iata: f.flight?.iata,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});