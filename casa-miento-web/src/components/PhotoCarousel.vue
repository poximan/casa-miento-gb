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
}

.frame {
  position: relative;
  width: 100%;
  height: 320px;
  border-radius: 16px;
  overflow: hidden;
  margin-top: 12px;
}

.slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.slide.active {
  opacity: 1;
  transform: scale(1);
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.5));
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.dots button {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
  padding: 0;
}

.dots button.active {
  background: #e0b4a4;
  border-color: #e0b4a4;
}

@media (max-width: 720px) {
  .frame {
    height: 240px;
  }
}
</style>
