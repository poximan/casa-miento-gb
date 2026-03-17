<template>
  <div class="countdown">
    <div class="row days">
      <div class="slot">
        <div class="value">{{ days }}</div>
        <div class="label">Días</div>
      </div>
    </div>
    <div class="row time">
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
  gap: 10px;
}

.row {
  display: flex;
  gap: 10px;
}

.row.time {
  flex-wrap: nowrap;
  justify-content: flex-start;
}

.row.days {
  justify-content: flex-start;
}

.slot {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(88, 88, 88, 0.06);
  border: 1px solid rgba(88, 88, 88, 0.15);
  text-align: center;
  color: #1f2937;
  min-width: 86px;
}

.value {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  color: #4b5563;
  letter-spacing: 0.08em;
  margin-top: 2px;
}

@media (max-width: 520px) {
  .row.time {
    flex-wrap: wrap;
  }
}
</style>
