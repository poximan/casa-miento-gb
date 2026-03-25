<template>
  <div class="carousel card">
    <div class="badge">Momentos</div>
    <div class="frame">
      <div
        v-for="(photo, index) in photos"
        :key="photo + index"
        class="slide"
        :class="{ active: index === current }"
        :style="{ backgroundImage: `url(${photo})` }"
      >
        <div class="overlay"></div>
      </div>
    </div>
    <div class="dots">
      <button
        v-for="(_, index) in photos"
        :key="index"
        :class="{ active: index === current }"
        @click="current = index"
        aria-label="Cambiar foto"
      ></button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  photos: {
    type: Array,
    default: () => [],
  },
});

const current = ref(0);
let timer = null;

const start = () => {
  if (timer) clearInterval(timer);
  if (!props.photos.length) return;
  timer = setInterval(() => {
    current.value = (current.value + 1) % props.photos.length;
  }, 3800);
};

watch(
  () => props.photos,
  () => start(),
  { immediate: true }
);

onMounted(start);

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.carousel {
  overflow: hidden;
  background: #fffdf7;
  border: 1px solid var(--border);
}

.frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 460px;
  min-height: 220px;
  border-radius: 16px;
  overflow: hidden;
  margin-top: 12px;
}

.slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0;
  transform: scale(1.02);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.slide.active {
  opacity: 1;
  transform: scale(1);
}

.overlay {
  display: none;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.dots button {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid rgba(63, 74, 60, 0.35);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.04);
  padding: 0;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.dots button.active {
  background: var(--accent);
  border-color: var(--accent);
  transform: scale(1.1);
  box-shadow: 0 0 0 3px rgba(63, 74, 60, 0.18);
}

@media (max-width: 720px) {
  .frame {
    aspect-ratio: 4 / 3;
    max-height: 320px;
    min-height: 200px;
  }
}
</style>
