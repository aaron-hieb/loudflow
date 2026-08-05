import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const events = await base44.asServiceRole.entities.Event.list("-end_date", 500);

    const toComplete = events.filter((e) => {
      const endStr = e.end_date || e.start_date;
      if (!endStr) return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return endStr < cutoffStr;
    });

    let updated = 0;
    if (toComplete.length > 0) {
      await base44.asServiceRole.entities.Event.bulkUpdate(
        toComplete.map((e) => ({ id: e.id, status: 'completed' }))
      );
      updated = toComplete.length;
    }

    return Response.json({ updated, checked: events.length, cutoff: cutoffStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});