<template>
  <div class="card payment">
    <div class="header">
      <div class="badge">Regalo / Transferencia</div>
      <p>Tu presencia es lo mas importante. Si queres colaborar, podes usar Mercado Pago o transferir.</p>
    </div>

    <div class="actions">
      <button v-if="showMpButton" class="primary-btn" @click="openMp">
        Abrir Mercado Pago
      </button>
      <div v-else class="hint">No hay un enlace de Mercado Pago configurado para este entorno.</div>
    </div>

    <div class="grid-two bank">
      <div>
        <div class="label">Alias</div>
        <div class="value">{{ bank.alias }}</div>
      </div>
      <div>
        <div class="label">CBU</div>
        <div class="value">{{ bank.cbu }}</div>
      </div>
      <div>
        <div class="label">Titular</div>
        <div class="value">{{ bank.holder }}</div>
      </div>
    </div>

    <p class="note">Este acceso abre solo el enlace configurado para Mercado Pago. No se aplican redirecciones alternativas.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  bank: {
    type: Object,
    required: true,
  },
  mercadoPago: {
    type: Object,
    required: true,
  },
});

const mpDeepLink = computed(() => props.mercadoPago?.deepLink || '');
const mpWebLink = computed(() => props.mercadoPago?.webLink || '');
const mpLink = computed(() => {
  if (typeof window === 'undefined') return mpWebLink.value || mpDeepLink.value;
  const ua = window.navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (isMobile && mpDeepLink.value) return mpDeepLink.value;
  return mpWebLink.value;
});

const showMpButton = computed(() => Boolean(mpLink.value));

const openMp = () => {
  if (!mpLink.value) return;
  window.location.href = mpLink.value;
};
</script>

<style scoped>
.payment {
  display: grid;
  gap: 16px;
}

.header p {
  margin-top: 8px;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.hint {
  color: var(--muted);
  font-size: 14px;
}

.bank {
  background: rgba(255, 255, 255, 0.92);
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: var(--text);
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: rgba(30, 35, 40, 0.6);
}

.value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.note {
  color: var(--muted);
  font-size: 13px;
}
</style>
