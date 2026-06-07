<template>
  <div class="countdown">
    <div class="lead">
      <div class="lead-copy">
        <span class="eyebrow">Cuenta atras</span>
        <h3>Faltan muy poquitos dias</h3>
        <p>Reservate la fecha y preparate para celebrarlo con nosotros.</p>
      </div>

      <div class="lead-days">
        <span class="lead-number">{{ days }}</span>
        <span class="lead-label">dias</span>
      </div>
    </div>

    <div class="time-grid">
      <div class="slot" v-for="item in timeParts" :key="item.label">
        <div class="value">{{ item.value }}</div>
        <div class="label">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  targetDate: {
    type: String,
    required: true,
  },
});

const now = ref(new Date());
let timer = null;

const diffParts = computed(() => {
  const target = new Date(props.targetDate);
  const diff = Math.max(target.getTime() - now.value.getTime(), 0);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
});

const days = computed(() => diffParts.value.days.toString().padStart(2, '0'));
const timeParts = computed(() => [
  { label: 'Horas', value: diffParts.value.hours.toString().padStart(2, '0') },
  { label: 'Minutos', value: diffParts.value.minutes.toString().padStart(2, '0') },
  { label: 'Segundos', value: diffParts.value.seconds.toString().padStart(2, '0') },
]);

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.countdown {
  display: grid;
  gap: 18px;
  margin-top: 8px;
  padding: 24px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(217, 132, 108, 0.14), transparent 30%),
    linear-gradient(145deg, #fff8f3 0%, #f8f4ee 100%);
  border: 1px solid rgba(63, 74, 60, 0.08);
  box-shadow: 0 24px 50px rgba(44, 43, 41, 0.08);
}

.lead {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) auto;
  gap: 18px;
  align-items: center;
}

.lead-copy {
  display: grid;
  gap: 6px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  font-weight: 700;
  color: #7e5b4d;
}

h3 {
  margin: 0;
  font-size: clamp(24px, 4vw, 38px);
  color: #2f392e;
}

p {
  margin: 0;
  color: #6b6b6b;
  line-height: 1.5;
}

.lead-days {
  min-width: 158px;
  padding: 18px 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, #31402f, #243022);
  color: #fff9f2;
  display: grid;
  justify-items: center;
  box-shadow: 0 18px 28px rgba(36, 48, 34, 0.24);
}

.lead-number {
  font-size: clamp(48px, 9vw, 74px);
  line-height: 0.95;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.lead-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.86;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.slot {
  padding: 16px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(63, 74, 60, 0.08);
  text-align: center;
  color: #1f2937;
}

.value {
  font-size: clamp(28px, 4.8vw, 42px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #2f392e;
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  color: #6b6b6b;
  letter-spacing: 0.12em;
  margin-top: 6px;
  font-weight: 700;
}

@media (max-width: 720px) {
  .lead {
    grid-template-columns: 1fr;
  }

  .lead-days {
    min-width: 0;
  }
}

@media (max-width: 560px) {
  .countdown {
    padding: 18px;
  }

  .time-grid {
    grid-template-columns: 1fr;
  }
}
</style>
