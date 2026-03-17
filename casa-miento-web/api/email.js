import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { generateInviteCard } from './invite-card.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    `Menú titular: ${payload.primaryGuest.menu || 'clasico'}`,
    `Asistencia: ${attendingText}`,
    `Acompañantes: ${extra.length}`,
    `Total personas: ${peopleCount}`,
    `Email contacto: ${payload.email || 'no informado'}`,
    `Teléfono: ${payload.phone || 'no informado'}`,
    `Evento: ${eventConfig?.couple?.bride ?? ''} & ${eventConfig?.couple?.groom ?? ''}`,
    `Fecha: ${eventConfig?.eventDate ?? ''}`,
    `Dirección: ${eventConfig?.venue ?? ''}`,
    `Mapa: ${eventConfig?.mapsLink ?? ''}`,
  ];
  if (extra.length) {
    lines.push(
      '',
      'Detalle acompañantes:',
      ...extra.map(
        (g, idx) => `${idx + 1}. ${g.firstName} ${g.lastName} - menú: ${g.menu || 'clásico'}`
      )
    );
  }
  return lines.join('\n');
};

export const sendInviteEmail = async (payload) => {
  console.log('Preparando email con payload:', {
    primaryGuest: payload.primaryGuest,
    email: payload.email,
    phone: payload.phone,
    extraGuests: payload.extraGuests?.length || 0,
    attending: payload.attending,
  });
  const eventConfig = await readEventConfig();
  const subjectBase = eventConfig
    ? `RSVP ${eventConfig.couple?.bride ?? ''} & ${eventConfig.couple?.groom ?? ''}`
    : 'RSVP boda';
  const text = buildEmail(payload, eventConfig);

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.log('--- RSVP (log sin SMTP) ---\n', text);
    return { sent: false, logged: true };
  }

  const recipient = (payload.email || '').trim();
  if (!recipient) {
    console.warn('No se envía correo: el invitado no proporcionó email.', payload.primaryGuest);
    return { sent: false, reason: 'no-email' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const meta = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: recipient,
    subject: `${subjectBase} (${payload.attending ? 'Sí' : 'No'})`,
    text: '',
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
    console.warn('No se pudo generar la tarjeta visual, se envía solo texto.', cardErr.message);
  }

  try {
    const info = await transporter.sendMail(meta);
    console.log('Email enviado OK', {
      messageId: info.messageId,
      envelope: info.envelope,
      to: meta.to,
      subject: meta.subject,
    });
    return { sent: true };
  } catch (err) {
    console.error('Error enviando email', {
      message: err.message,
      stack: err.stack,
    });
    throw err;
  }
};
