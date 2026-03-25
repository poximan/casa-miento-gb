import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateInviteCard } from './invite-card.js';
import { fromAddress, buildTransport } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readEventConfig = async () => {
  const filePath = path.join(__dirname, '..', 'public', 'event-config.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
};

const buildEmail = (payload, eventConfig) => {
  const extra = payload.extraGuests || [];
  const peopleCount = 1 + extra.length;
  const attendingText = payload.attending ? 'Asiste' : 'No asiste';
  const lines = [
    `Invitado: ${payload.primaryGuest.firstName} ${payload.primaryGuest.lastName}`,
    `Menu titular: ${payload.primaryGuest.menu}`,
    `Asistencia: ${attendingText}`,
    `Acompanantes: ${extra.length}`,
    `Total personas: ${peopleCount}`,
    `Email contacto: ${payload.email}`,
    `Telefono: ${payload.phone || ''}`,
    `Evento: ${eventConfig?.couple?.bride ?? ''} & ${eventConfig?.couple?.groom ?? ''}`,
    `Fecha: ${eventConfig?.eventDate ?? ''}`,
    `Direccion: ${eventConfig?.venue ?? ''}`,
    `Mapa: ${eventConfig?.mapsLink ?? ''}`,
  ];
  if (extra.length) {
    lines.push(
      '',
      'Detalle acompanantes:',
      ...extra.map((g, idx) => `${idx + 1}. ${g.firstName} ${g.lastName} - menu: ${g.menu}`)
    );
  }
  return lines.join('\n');
};

export const sendInviteEmail = async (payload) => {
  const eventConfig = await readEventConfig();
  const subjectBase = `RSVP ${eventConfig.couple?.bride ?? ''} & ${eventConfig.couple?.groom ?? ''}`;
  const text = buildEmail(payload, eventConfig);

  const emailFrom = fromAddress();

  const recipient = (payload.email || '').trim();
  if (!recipient) {
    throw new Error('EMAIL_REQUIRED_FOR_CONFIRMATION');
  }

  const transporter = buildTransport();

  const meta = {
    from: emailFrom,
    to: recipient,
    subject: `${subjectBase} (${payload.attending ? 'Si' : 'No'})`,
    text,
  };

  const card = await generateInviteCard({ payload, eventConfig });
  meta.attachments = [
    {
      filename: card.filename,
      content: card.buffer,
      contentType: card.contentType,
    },
  ];

  const info = await transporter.sendMail(meta);
  console.log('Email enviado OK', {
    messageId: info.messageId,
    envelope: info.envelope,
    to: meta.to,
    subject: meta.subject,
  });
  return { sent: true };
};
