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
    clasico: 'Clásico',
    vegetariano: 'Vegetariano',
    celiaco: 'Celíaco',
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
    `Menú titular: ${formatMenu(payload.primaryGuest?.menu)}`,
    `Acompañantes: ${payload.extraGuests?.length || 0}`,
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
