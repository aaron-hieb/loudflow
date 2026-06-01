import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const crew = body.data;
    if (!crew || !crew.email) {
      return Response.json({ skipped: true, reason: "No email on crew member" });
    }

    const eventId = crew.event_id;
    let eventName = "an upcoming event";

    if (eventId) {
      const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
      if (events.length > 0) {
        eventName = events[0].name || eventName;
      }
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: crew.email,
      subject: `You've been added to the crew for ${eventName}`,
      body: `Hi ${crew.name},\n\nYou have been added as ${crew.role} on the event "${eventName}".\n\nPlease log in to FlowDaddy to view event details, schedule, and more.\n\nSee you there!`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});