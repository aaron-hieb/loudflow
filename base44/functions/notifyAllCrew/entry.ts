import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { event_id, subject, message } = await req.json();

    if (!event_id || !subject || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const crew = await base44.asServiceRole.entities.CrewMember.filter({ event_id });
    const recipients = crew.filter((m) => m.email && m.status !== 'cancelled');

    if (recipients.length === 0) {
      return Response.json({ sent: 0, skipped: 0, message: 'No crew members with emails found.' });
    }

    let sent = 0;
    let skipped = 0;

    for (const member of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: member.email,
        subject,
        body: `Hi ${member.name},\n\n${message}\n\n— ${user.full_name || 'The Production Team'}`,
      });
      sent++;
    }

    return Response.json({ sent, skipped, total: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});