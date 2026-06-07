<template>
  <main class="page guest-page">
    <div class="top-nav">
      <RouterLink to="/" class="ghost-btn">Invitado</RouterLink>
      <RouterLink to="/admin" class="ghost-btn">Organizador</RouterLink>
    </div>

    <div v-if="loading" class="card">Cargando detalles del evento...</div>
    <div v-else-if="error" class="card error">{{ error }}</div>

    <template v-else>
      <section class="card hero">
        <div class="hero-bg"></div>
        <div class="badge">Nuestra boda</div>
        <h1 class="names">
          <span class="script">{{ config.couple.bride }}</span>
          <span class="amp">&amp;</span>
          <span class="script">{{ config.couple.groom }}</span>
        </h1>
        <p class="muted intro">
          Nos encantaria compartir este dia con vos. Guarda la fecha y sumate a la celebracion.
        </p>

        <div class="hero-actions">
          <a class="primary-btn" href="#rsvp">Confirmar asistencia</a>
          <a class="ghost-btn hero-ghost" href="#event-info">Ver lugar y fecha</a>
        </div>
      </section>

      <section id="event-info" class="section event-layout">
        <article class="card info-block place-block">
          <div class="section-tag">Lugar</div>
          <div class="place-copy">
            <h2>{{ config.venue }}</h2>
            <p class="muted place-text">
              Toca la miniatura para abrir el punto exacto en Google Maps y llegar con GPS desde el movil.
            </p>
          </div>

          <a
            class="map-card"
            :href="config.mapsLink"
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir ubicacion en Google Maps"
          >
            <div class="map-preview" aria-hidden="true">
              <div class="map-grid"></div>
              <div class="map-road road-a"></div>
              <div class="map-road road-b"></div>
              <div class="map-road road-c"></div>
              <div class="map-marker">
                <span class="map-marker-dot"></span>
              </div>
              <div class="map-label">Google Maps</div>
            </div>

            <div class="map-meta">
              <strong>Abrir ubicacion</strong>
              <span>Ver ruta y usar navegacion paso a paso</span>
            </div>
          </a>
        </article>

        <article class="card info-block date-block">
          <div class="section-tag">Fecha</div>
          <div class="date-copy">
            <h2>{{ eventDay }}</h2>
            <p class="date-hour">{{ eventHour }}</p>
            <p class="muted date-detail">{{ formattedDate }}</p>
          </div>

          <Countdown :target-date="config.eventDate" />
        </article>
      </section>

      <PhotoCarousel v-if="photos.length" :photos="photos" />
      <div v-else-if="photosError" class="card error">{{ photosError }}</div>

      <section class="section grid-two">
        <PaymentSection :bank="config.bank" :mercado-pago="config.mercadoPago" />

        <div class="card details-card">
          <div class="badge">Detalles del evento</div>
          <div class="detail-grid">
            <article class="detail-item">
              <span class="detail-kicker">Llegada</span>
              <strong>15 minutos antes</strong>
              <p>Asi arrancamos tranquilos y sin corridas.</p>
            </article>
            <article class="detail-item">
              <span class="detail-kicker">Dress code</span>
              <strong>Elegancia comoda</strong>
              <p>La idea es que vengas lindo y disfrutes toda la noche.</p>
            </article>
            <article class="detail-item">
              <span class="detail-kicker">Acompanantes</span>
              <strong>Sumalos al confirmar</strong>
              <p>Podes agregarlos directamente en el RSVP.</p>
            </article>
            <article class="detail-item">
              <span class="detail-kicker">Menus</span>
              <strong>Uno por invitado</strong>
              <p>Cada persona puede elegir su opcion al completar la respuesta.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="rsvp" class="section">
        <RsvpForm
          :suggested-guests="config.suggestedGuests"
          @submitted="toast = 'Respuesta guardada (revisa tu email para confirmacion).'"
        />
      </section>

      <div v-if="toast" class="toast card">
        {{ toast }}
        <button class="ghost-btn" @click="toast = ''">Cerrar</button>
      </div>

      <footer class="footer">
        <h2>Te esperamos</h2>
        <p class="muted">Con carino, {{ config.couple.bride }} &amp; {{ config.couple.groom }}</p>
      </footer>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Countdown from '../components/Countdown.vue';
import PhotoCarousel from '../components/PhotoCarousel.vue';
import PaymentSection from '../components/PaymentSection.vue';
import RsvpForm from '../components/RsvpForm.vue';
import { ApiErrorMapper } from '../services/ApiErrorMapper.js';

const config = ref(null);
const loading = ref(true);
const error = ref('');
const toast = ref('');
const photos = ref([]);
const photosError = ref('');

onMounted(async () => {
  try {
    const res = await fetch('/event-config.json');
    if (!res.ok) throw new Error('No se pudo leer la configuracion.');
    config.value = await res.json();
    await loadPhotos();
  } catch (err) {
    error.value = err.message || 'Error cargando la pagina.';
  } finally {
    loading.value = false;
  }
});

const loadPhotos = async () => {
  if (!config.value) return;
  try {
    const res = await fetch('/api/photos');
    if (!res.ok) {
      throw await ApiErrorMapper.fromResponse(res, 'No se pudo cargar el carrusel.');
    }
    const data = await res.json();
    photos.value = Array.isArray(data.photos) ? data.photos : [];
    photosError.value = '';
  } catch (err) {
    const mapped = ApiErrorMapper.fromUnknown(err, 'No se pudo cargar el carrusel.');
    console.error('[landing] Fallo la carga de fotos.', mapped);
    photos.value = [];
    photosError.value = mapped.message;
    if (mapped.code === 'CONFIG_MISSING') {
      window.alert(mapped.detail || mapped.message);
    }
  }
};

const formattedDate = computed(() => {
  if (!config.value?.eventDate) return '';
  const d = new Date(config.value.eventDate);
  return d.toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const eventDay = computed(() => {
  if (!config.value?.eventDate) return '';
  const d = new Date(config.value.eventDate);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
});

const eventHour = computed(() => {
  if (!config.value?.eventDate) return '';
  const d = new Date(config.value.eventDate);
  return `${d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })} hs`;
});
</script>

<style scoped>
.guest-page {
  display: grid;
  gap: 24px;
}

.top-nav {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.hero {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 18px;
  padding: 48px 42px;
  background:
    linear-gradient(145deg, rgba(255, 251, 246, 0.98), rgba(248, 242, 233, 0.96)),
    var(--card);
  min-height: 320px;
  align-content: center;
}

.names {
  font-size: clamp(42px, 7vw, 68px);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.script {
  font-family: 'Great Vibes', 'Playfair Display', cursive;
  font-weight: 700;
}

.amp {
  font-size: 44px;
  color: var(--accent);
}

.muted {
  color: var(--muted);
}

.intro {
  text-align: center;
  font-size: 18px;
  max-width: 700px;
  justify-self: center;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-ghost {
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(10px);
}

.event-layout {
  margin-top: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  align-items: stretch;
}

.info-block {
  display: grid;
  gap: 18px;
  padding: 28px;
}

.section-tag {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

.place-block {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 244, 238, 0.98));
}

.place-copy,
.date-copy {
  display: grid;
  gap: 8px;
}

.place-copy h2,
.date-copy h2 {
  font-size: clamp(28px, 3.4vw, 40px);
  text-transform: capitalize;
}

.place-text,
.date-detail {
  max-width: 54ch;
}

.map-card {
  display: grid;
  gap: 12px;
  color: inherit;
}

.map-preview {
  position: relative;
  min-height: 220px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(63, 74, 60, 0.12);
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.9), transparent 28%),
    linear-gradient(135deg, #ebe3d6 0%, #f5efe6 48%, #e3eadf 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(88, 102, 87, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(88, 102, 87, 0.08) 1px, transparent 1px);
  background-size: 36px 36px;
}

.map-road {
  position: absolute;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 20px rgba(89, 74, 49, 0.08);
}

.road-a {
  width: 130%;
  height: 18px;
  left: -8%;
  top: 42%;
  transform: rotate(-12deg);
}

.road-b {
  width: 18px;
  height: 120%;
  left: 62%;
  top: -8%;
  transform: rotate(8deg);
}

.road-c {
  width: 72%;
  height: 14px;
  left: 18%;
  top: 68%;
  transform: rotate(18deg);
}

.map-marker {
  position: absolute;
  right: 24%;
  top: 34%;
  width: 44px;
  height: 44px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: linear-gradient(180deg, #d9846c, #b75b42);
  box-shadow: 0 18px 26px rgba(183, 91, 66, 0.3);
  display: grid;
  place-items: center;
}

.map-marker-dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff8f2;
  transform: rotate(45deg);
}

.map-label {
  position: absolute;
  left: 18px;
  bottom: 18px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(63, 74, 60, 0.12);
  color: var(--accent-strong);
  font-weight: 700;
  font-size: 13px;
}

.map-meta {
  display: grid;
  gap: 4px;
}

.map-meta strong {
  font-size: 18px;
}

.map-meta span {
  color: var(--muted);
}

.date-block {
  background:
    radial-gradient(circle at top right, rgba(217, 132, 108, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(248, 250, 246, 0.98), rgba(255, 252, 247, 0.98));
}

.date-hour {
  margin: 0;
  font-size: clamp(28px, 5vw, 52px);
  line-height: 1;
  font-weight: 800;
  color: var(--accent-strong);
}

.toast {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer {
  text-align: center;
  color: var(--muted);
}

.details-card {
  display: grid;
  gap: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(251, 247, 241, 0.98));
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-item {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(63, 74, 60, 0.08);
  background: rgba(255, 255, 255, 0.74);
  display: grid;
  gap: 6px;
}

.detail-item strong {
  font-size: 18px;
  color: var(--accent-strong);
}

.detail-item p {
  line-height: 1.5;
}

.detail-kicker {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  color: var(--accent);
  font-weight: 700;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 40%, rgba(151, 181, 143, 0.18), transparent 38%),
    radial-gradient(circle at 70% 20%, rgba(202, 184, 156, 0.22), transparent 32%),
    url('/assets/fondo-watercolor.svg');
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0.28;
  pointer-events: none;
  filter: saturate(0.9);
}

@media (max-width: 920px) {
  .event-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 32px 24px;
    min-height: auto;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .info-block {
    padding: 22px;
  }

  .map-preview {
    min-height: 190px;
  }
}
</style>
