<template>
  <div class="card payment">
    <div class="header">
      <div class="badge">Regalo / Transferencia</div>
      <p>Tu presencia es lo más importante. Si querés colaborar, podés usar Mercado Pago o transferir.</p>
    </div>

    <div class="actions">
      <button v-if="showMpButton" class="primary-btn" @click="openMp">
        Abrir Mercado Pago
      </button>
      <div class="hint" v-else>Si estás en desktop, usá los datos bancarios para transferir.</div>
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

    <p class="note">
      Al abrir en Mercado Pago se intenta ir directo a la transferencia con el alias. Si no se abre la app,
      redirigimos automáticamente al flujo web para que completes el monto.
    </p>
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
    default: () => ({}),
  },
});

const mpDeepLink = computed(() => props.mercadoPago?.deepLink || `mercadopago://send?alias=${props.bank.alias}`);
const mpFallback = computed(() => props.mercadoPago?.webLink || 'https://www.mercadopago.com.ar/money-transfer');

const showMpButton = computed(() => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  return isMobile && !!mpDeepLink.value;
});

const openMp = () => {
  if (!mpDeepLink.value) return;
  window.location.href = mpDeepLink.value;
  const fallback = mpFallback.value;
  if (!fallback) return;
  setTimeout(() => {
    if (!document.hidden) {
      window.location.href = fallback;
    }
  }, 1600);
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
