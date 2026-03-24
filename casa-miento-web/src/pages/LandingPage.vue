<template>
  <main class="page">
    <div class="top-nav">
      <RouterLink to="/" class="ghost-btn">Invitado</RouterLink>
      <RouterLink to="/admin" class="ghost-btn">Organizador</RouterLink>
    </div>

    <div v-if="loading" class="card">Cargando detalles del evento...</div>
    <div v-else-if="error" class="card error">{{ error }}</div>

    <template v-else>
      <section class="card hero">
        <div class="badge">Nuestra boda</div>
        <h1 class="names">
          <span class="script">{{ config.couple.bride }}</span>
          <span class="amp">&amp;</span>
          <span class="script">{{ config.couple.groom }}</span>
        </h1>
        <p class="muted">
          Nos encantaria compartir este dia con vos. Guarda la fecha y sumate a la celebracion.
        </p>

        <div class="hero-meta">
          <div>
            <div class="label">Fecha</div>
            <div class="value">{{ formattedDate }}</div>
          </div>
          <div>
            <div class="label">Lugar</div>
            <div class="value">{{ config.venue }}</div>
          </div>
          <div>
            <div class="label">Ubicacion</div>
            <a class="value link" :href="config.mapsLink" target="_blank" rel="noreferrer">
              Ver en Google Maps
            </a>
          </div>
        </div>

        <Countdown :target-date="config.eventDate" />
      </section>

      <PhotoCarousel v-if="photos.length" :photos="photos" />

      <section class="section grid-two">
        <PaymentSection :bank="config.bank" :mercado-pago="config.mercadoPago" />

        <div class="card info">
          <div class="badge">Detalles</div>
          <ul>
            <li>Dress code: elegancia comoda.</li>
            <li>Te recomendamos llegar 15 minutos antes para la ceremonia.</li>
            <li>Si necesitas algo especial, escribinos en el formulario.</li>
          </ul>
          <a class="ghost-btn" :href="config.mapsLink" target="_blank" rel="noreferrer">Abrir mapa</a>
        </div>
      </section>

      <RsvpForm
        :suggested-guests="config.suggestedGuests"
        @submitted="toast = 'Respuesta guardada (revisa tu email para confirmacion).'"
      />

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

const config = ref(null);
const loading = ref(true);
const error = ref('');
const toast = ref('');
const photos = ref([]);

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
    const data = res.ok ? await res.json() : { photos: [] };
    photos.value = Array.isArray(data.photos) ? data.photos : [];
  } catch (err) {
    photos.value = [];
    console.warn('Fallo la carga de fotos del album, no se muestran imagenes.', err?.message || err);
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
</script>

<style scoped>
.top-nav {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 12px;
}

.hero {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 14px;
}

.names {
  font-size: clamp(32px, 6vw, 56px);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.script {
  font-family: 'Great Vibes', 'Playfair Display', cursive;
  font-weight: 600;
}

.amp {
  font-size: 40px;
  color: var(--accent);
}

.muted {
  color: var(--muted);
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: rgba(248, 250, 252, 0.8);
}

.value {
  margin-top: 4px;
  font-weight: 600;
}

.link {
  color: var(--accent);
}

ul {
  margin: 12px 0;
  padding-left: 18px;
  color: var(--muted);
}

.info {
  display: grid;
  gap: 10px;
}

.toast {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer {
  margin-top: 28px;
  text-align: center;
  color: var(--muted);
}

.admin-link {
  display: inline-block;
  text-align: center;
}
</style>
