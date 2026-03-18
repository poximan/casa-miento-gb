<template>
  <transition name="modal-fade">
    <div v-if="open" class="overlay" @click.self="emitClose">
      <div class="panel" role="dialog" aria-modal="true" :aria-label="title">
        <div class="icon-wrap" aria-hidden="true">!</div>
        <h4>{{ title }}</h4>
        <p>{{ detail }}</p>
        <button class="primary-btn" type="button" @click="emitClose">Entendido</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Ocurrio un problema',
  },
  detail: {
    type: String,
    default: 'No se pudo completar la accion.',
  },
});

const emit = defineEmits(['close']);

const emitClose = () => {
  if (!props.open) return;
  emit('close');
};
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 17, 0.52);
  display: grid;
  place-items: center;
  z-index: 1200;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.panel {
  width: min(520px, 100%);
  border-radius: 20px;
  border: 1px solid rgba(217, 132, 108, 0.35);
  background: linear-gradient(165deg, #fff9f5 0%, #fff1e8 100%);
  box-shadow: 0 26px 70px rgba(68, 41, 31, 0.34);
  padding: 24px;
  display: grid;
  gap: 12px;
}

.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #d9846c;
  color: #fff;
  font-weight: 800;
}

h4 {
  margin: 0;
  color: #42251d;
}

p {
  margin: 0;
  color: #5a4037;
  line-height: 1.45;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
