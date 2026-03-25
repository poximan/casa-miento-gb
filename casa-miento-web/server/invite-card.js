import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const formatDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMenu = (menu = 'clasico') => {
  const map = {
    clasico: 'Clasico',
    vegetariano: 'Vegetariano',
    celiaco: 'Celiaco',
    infantil: 'Infantil',
  };
  const normalized = typeof menu === 'string' ? menu.toLowerCase() : 'clasico';
  return map[normalized] || map.clasico;
};

export const generateInviteCard = async ({ payload, eventConfig }) => {
  const templatePath = path.join(__dirname, '..', 'public', 'assets', 'plantilla.jpg');
  await fs.access(templatePath);
  const image = await loadImage(templatePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(15, 15, 15, 0.65)';
  const panelHeight = canvas.height * 0.32;
  ctx.fillRect(0, canvas.height - panelHeight, canvas.width, panelHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const centerX = canvas.width / 2;
  let cursorY = canvas.height - panelHeight / 2 - canvas.height * 0.05;

  const names =
    `${payload.primaryGuest?.firstName || ''} ${payload.primaryGuest?.lastName || ''}`.trim() || 'Invitado Especial';
  ctx.fillStyle = '#fefefe';
  ctx.font = `bold ${Math.round(canvas.width * 0.05)}px "Playfair Display", serif`;
  ctx.fillText(names, centerX, cursorY);

  cursorY += canvas.height * 0.07;
  ctx.font = `600 ${Math.round(canvas.width * 0.025)}px "Inter", sans-serif`;
  const dateText = formatDate(eventConfig?.eventDate);
  ctx.fillText(`${eventConfig?.venue || 'Lugar a confirmar'} • ${dateText}`, centerX, cursorY);

  cursorY += canvas.height * 0.05;
  ctx.font = `400 ${Math.round(canvas.width * 0.024)}px "Inter", sans-serif`;
  const extras = (payload.extraGuests || []).map(
    (guest, idx) => `${idx + 1}. ${guest.firstName} ${guest.lastName} (${formatMenu(guest.menu)})`
  );
  const infoLines = [
    `Menu titular: ${formatMenu(payload.primaryGuest?.menu)}`,
    `Acompanantes: ${payload.extraGuests?.length || 0}`,
    extras.length ? `Detalle: ${extras.join(' • ')}` : '',
    `Contacto: ${payload.email || 'sin email'}`,
  ].filter(Boolean);

  infoLines.forEach((line) => {
    ctx.fillText(line, centerX, cursorY);
    cursorY += canvas.height * 0.035;
  });

  return {
    buffer: canvas.toBuffer('image/jpeg', { quality: 0.9 }),
    filename: 'invitacion.jpg',
    contentType: 'image/jpeg',
  };
};

export const generateFallbackCard = async ({ payload, eventConfig }) => {
  const width = 1080;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f7ede5');
  gradient.addColorStop(1, '#e5d2c7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#3a2a22';
  ctx.font = `bold ${Math.round(width * 0.06)}px "Playfair Display", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('RSVP Confirmado', width / 2, height * 0.12);

  ctx.font = `600 ${Math.round(width * 0.04)}px "Inter", sans-serif`;
  ctx.fillText(
    `${payload.primaryGuest?.firstName || ''} ${payload.primaryGuest?.lastName || ''}`.trim() || 'Invitado',
    width / 2,
    height * 0.25
  );

  ctx.font = `400 ${Math.round(width * 0.028)}px "Inter", sans-serif`;
  const infoLines = [
    `Evento: ${eventConfig?.couple?.bride ?? ''} & ${eventConfig?.couple?.groom ?? ''}`,
    `Fecha: ${formatDate(eventConfig?.eventDate) || 'A definir'}`,
    `Lugar: ${eventConfig?.venue || 'A definir'}`,
    `Asistencia: ${payload.attending ? 'Si asiste' : 'No asiste'}`,
    `Menu titular: ${formatMenu(payload.primaryGuest?.menu)}`,
    `Acompanantes: ${payload.extraGuests?.length || 0}`,
  ];

  let cursorY = height * 0.38;
  infoLines.forEach((line) => {
    ctx.fillText(line, width / 2, cursorY);
    cursorY += height * 0.06;
  });

  return {
    buffer: canvas.toBuffer('image/png'),
    filename: 'rsvp.png',
    contentType: 'image/png',
  };
};
