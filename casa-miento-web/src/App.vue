<template>
  <main class="page">
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
          Nos encantará compartir este día con vos. Guardá la fecha y sumate a la celebración.
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
            <div class="label">Ubicación</div>
            <a class="value link" :href="config.mapsLink" target="_blank" rel="noreferrer">
              Ver en Google Maps
            </a>
          </div>
        </div>

        <Countdown :target-date="config.eventDate" />
      </section>

      <PhotoCarousel :photos="config.photos" />

      <section class="section grid-two">
        <PaymentSection :bank="config.bank" :mercado-pago="config.mercadoPago" />

        <div class="card info">
          <div class="badge">Detalles</div>
          <ul>
            <li>Dress code: elegancia cómoda.</li>
            <li>Te recomendamos llegar 15 minutos antes para la ceremonia.</li>
            <li>Si necesitás algo especial, escribinos en el formulario.</li>
          </ul>
          <a class="ghost-btn" :href="config.mapsLink" target="_blank" rel="noreferrer">Abrir mapa</a>
        </div>
      </section>

      <RsvpForm @submitted="toast = 'Respuesta guardada (log en consola para email).'" />

      <AdminPanel :admin-user="config.admin.user" :admin-password="config.admin.password" />

      <div v-if="toast" class="toast card">
        {{ toast }}
        <button class="ghost-btn" @click="toast = ''">Cerrar</button>
      </div>

      <footer class="footer">
        <h2>Te esperamos</h2>
        <p class="muted">Con cariño, {{ config.couple.bride }} &amp; {{ config.couple.groom }}</p>
      </footer>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import Countdown from './components/Countdown.vue';
import PhotoCarousel from './components/PhotoCarousel.vue';
import PaymentSection from './components/PaymentSection.vue';
import RsvpForm from './components/RsvpForm.vue';
import AdminPanel from './components/AdminPanel.vue';

const config = ref(null);
const loading = ref(true);
const error = ref('');
const toast = ref('');

onMounted(async () => {
  try {
    const res = await fetch('/event-config.json');
    if (!res.ok) throw new Error('No se pudo leer la configuración.');
    config.value = await res.json();
  } catch (err) {
    error.value = err.message || 'Error cargando la página.';
  } finally {
    loading.value = false;
  }
});

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
</style>
