import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateInviteCard } from './invite-card.js';
import { requiredEnv, requiredIntEnv } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readEventConfig = async () => {
  try {
    const filePath = path.join(__dirname, '..', 'public', 'event-config.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('No se pudo leer event-config.json para email:', err.message);
    return null;
  }
};

const buildEmail = (payload, eventConfig) => {
  const extra = payload.extraGuests || [];
  const peopleCount = 1 + extra.length;
  const attendingText = payload.attending ? 'Asiste' : 'No asiste';
  const lines = [
    `Invitado: ${payload.primaryGuest.firstName} ${payload.primaryGuest.lastName}`,
    `Menu titular: ${payload.primaryGuest.menu || 'clasico'}`,
    `Asistencia: ${attendingText}`,
    `Acompanantes: ${extra.length}`,
    `Total personas: ${peopleCount}`,
    `Email contacto: ${payload.email || 'no informado'}`,
    `Telefono: ${payload.phone || 'no informado'}`,
    `Evento: ${eventConfig?.couple?.bride ?? ''} & ${eventConfig?.couple?.groom ?? ''}`,
    `Fecha: ${eventConfig?.eventDate ?? ''}`,
    `Direccion: ${eventConfig?.venue ?? ''}`,
    `Mapa: ${eventConfig?.mapsLink ?? ''}`,
  ];
  if (extra.length) {
    lines.push(
      '',
      'Detalle acompanantes:',
      ...extra.map((g, idx) => `${idx + 1}. ${g.firstName} ${g.lastName} - menu: ${g.menu || 'clasico'}`)
    );
  }
  return lines.join('\n');
};

export const sendInviteEmail = async (payload) => {
  const eventConfig = await readEventConfig();
  const subjectBase = eventConfig
    ? `RSVP ${eventConfig.couple?.bride ?? ''} & ${eventConfig.couple?.groom ?? ''}`
    : 'RSVP boda';
  const text = buildEmail(payload, eventConfig);

  const emailHost = requiredEnv('EMAIL_HOST');
  const emailPort = requiredIntEnv('EMAIL_PORT');
  const emailUser = requiredEnv('EMAIL_USER');
  const emailPass = requiredEnv('EMAIL_PASS');
  const emailFrom = requiredEnv('EMAIL_FROM');

  const recipient = (payload.email || '').trim();
  if (!recipient) {
    console.warn('No se envia correo: el invitado no proporciono email.', payload.primaryGuest);
    return { sent: false, reason: 'no-email' };
  }

  const transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const meta = {
    from: emailFrom,
    to: recipient,
    subject: `${subjectBase} (${payload.attending ? 'Si' : 'No'})`,
    text,
  };

  try {
    const card = await generateInviteCard({ payload, eventConfig });
    meta.attachments = [
      {
        filename: card.filename,
        content: card.buffer,
        contentType: card.contentType,
      },
    ];
  } catch (cardErr) {
    console.warn('No se pudo generar la tarjeta visual, se envia solo texto.', cardErr.message);
  }

  const info = await transporter.sendMail(meta);
  console.log('Email enviado OK', {
    messageId: info.messageId,
    envelope: info.envelope,
    to: meta.to,
    subject: meta.subject,
  });
  return { sent: true };
};
