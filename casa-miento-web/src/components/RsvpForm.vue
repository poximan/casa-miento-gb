<template>
  <div class="card rsvp">
    <div class="header">
      <div class="badge">Confirmar asistencia</div>
      <p>Contanos si podés venir y quiénes te acompañan. Podés agregar tantos invitados como necesites.</p>
    </div>

    <div class="attending-toggle">
      <button
        class="ghost-btn"
        :class="{ active: form.attending === true }"
        type="button"
        @click="form.attending = true"
      >
        Sí, voy
      </button>
      <button
        class="ghost-btn"
        :class="{ active: form.attending === false }"
        type="button"
        @click="form.attending = false"
      >
        No puedo
      </button>
    </div>

    <div class="grid-two">
      <div class="field">
        <label>Buscar en lista de invitados (opcional)</label>
        <input
          v-model="suggestionQuery"
          list="guest-suggestions"
          type="text"
          placeholder="Escribí un nombre y elegilo para autocompletar"
          @change="applySuggestion"
        />
        <datalist id="guest-suggestions">
          <option v-for="guest in suggestions" :key="guest" :value="guest" />
        </datalist>
        <p class="hint">Solo es una guía. Si no estás en la lista, podés completar igual.</p>
      </div>
      <div class="field">
        <label>Nombre</label>
        <input v-model="form.primaryFirstName" type="text" placeholder="Tu nombre" />
      </div>
      <div class="field">
        <label>Apellido</label>
        <input v-model="form.primaryLastName" type="text" placeholder="Tu apellido" />
      </div>
      <div class="field">
        <label>Menú titular</label>
        <select v-model="form.primaryMenu">
          <option value="clasico">Clásico</option>
          <option value="vegetariano">Vegetariano</option>
          <option value="celiaco">Celíaco</option>
          <option value="infantil">Infantil</option>
        </select>
      </div>
      <div class="field">
        <label>Email (opcional)</label>
        <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" />
      </div>
      <div class="field">
        <label>Teléfono (opcional)</label>
        <input v-model="form.phone" type="tel" placeholder="Solo por si necesitamos contactarte" />
      </div>
    </div>

    <div class="extras">
      <div class="extras-head">
        <h3>Invitados adicionales</h3>
        <button type="button" class="ghost-btn" @click="addGuest">Agregar invitado</button>
      </div>
      <p class="small">Cada invitado extra puede indicar menú especial.</p>

      <div v-if="!form.extraGuests.length" class="empty">Todavía no agregaste invitados extra.</div>

      <div v-for="(guest, index) in form.extraGuests" :key="index" class="guest card">
        <div class="guest-head">
          <strong>Invitado {{ index + 1 }}</strong>
          <button type="button" class="ghost-btn" @click="removeGuest(index)">Eliminar</button>
        </div>
        <div class="grid-two">
          <div class="field">
            <label>Nombre</label>
            <input v-model="guest.firstName" type="text" placeholder="Nombre" />
          </div>
          <div class="field">
            <label>Apellido</label>
            <input v-model="guest.lastName" type="text" placeholder="Apellido" />
          </div>
          <div class="field">
            <label>Menú</label>
            <select v-model="guest.menu">
              <option value="clasico">Clásico</option>
              <option value="vegetariano">Vegetariano</option>
              <option value="celiaco">Celíaco</option>
              <option value="infantil">Infantil</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="submit">
      <button class="primary-btn" :disabled="isSubmitting" @click="submit">
        {{ isSubmitting ? 'Enviando...' : 'Confirmar invitación' }}
      </button>
      <div v-if="message" class="message" :class="message.kind">{{ message.text }}</div>
    </div>

    <AppModal
      :open="modal.open"
      :title="modal.title"
      :detail="modal.detail"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import AppModal from './AppModal.vue';
import { AppError } from '../domain/AppError.js';
import { ApiErrorMapper } from '../services/ApiErrorMapper.js';
import { useErrorModal } from '../composables/useErrorModal.js';

const props = defineProps({
  suggestedGuests: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['submitted']);
const { modal, openForError, closeModal } = useErrorModal();

const form = reactive({
  attending: true,
  primaryFirstName: '',
  primaryLastName: '',
  primaryMenu: 'clasico',
  email: '',
  phone: '',
  extraGuests: [],
});

const suggestionQuery = ref('');
const isSubmitting = ref(false);
const message = ref(null);

const suggestions = computed(() =>
  (props.suggestedGuests || [])
    .map((s) => s?.toString().trim())
    .filter((s) => s)
);

const addGuest = () => {
  form.extraGuests.push({
    firstName: '',
    lastName: '',
    menu: 'clasico',
  });
};

const removeGuest = (index) => {
  form.extraGuests.splice(index, 1);
};

const applySuggestion = () => {
  const value = suggestionQuery.value.trim();
  if (!value) return;
  const parts = value.split(' ');
  form.primaryFirstName = parts.shift() || '';
  form.primaryLastName = parts.join(' ') || '';
};

const validate = () => {
  if (!form.primaryFirstName.trim() || !form.primaryLastName.trim()) {
    return 'Nombre y apellido son obligatorios.';
  }

  for (const guest of form.extraGuests) {
    if (!guest.firstName.trim() || !guest.lastName.trim()) {
      return 'Completa nombre y apellido de cada invitado extra.';
    }
  }

  return null;
};

const submit = async () => {
  const error = validate();
  if (error) {
    message.value = { kind: 'error', text: error };
    return;
  }

  isSubmitting.value = true;
  message.value = null;

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attending: form.attending,
        primaryGuest: {
          firstName: form.primaryFirstName,
          lastName: form.primaryLastName,
          menu: form.primaryMenu,
        },
        email: form.email || null,
        phone: form.phone || null,
        extraGuests: form.extraGuests,
      }),
    });

    if (!response.ok) {
      const mapped = await ApiErrorMapper.fromResponse(response, 'No pudimos guardar tu respuesta.');
      openForError(mapped);
      throw mapped;
    }

    message.value = { kind: 'success', text: 'Respuesta recibida. Gracias por avisarnos.' };
    emit('submitted');

    form.primaryFirstName = '';
    form.primaryLastName = '';
    form.primaryMenu = 'clasico';
    form.email = '';
    form.phone = '';
    form.extraGuests = [];
    form.attending = true;
    suggestionQuery.value = '';
  } catch (errorCaught) {
    const mapped = errorCaught instanceof AppError
      ? errorCaught
      : ApiErrorMapper.fromUnknown(errorCaught, 'No pudimos guardar tu respuesta.');

    if (!(errorCaught instanceof AppError)) {
      openForError(mapped);
    }

    message.value = { kind: 'error', text: mapped.message };
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.rsvp {
  display: grid;
  gap: 16px;
}

.header p {
  margin-top: 8px;
}

.attending-toggle {
  display: inline-flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 6px;
  border: 1px solid var(--border);
}

.ghost-btn.active {
  border-color: rgba(224, 180, 164, 0.8);
  color: var(--accent);
  background: rgba(224, 180, 164, 0.1);
}

.field {
  display: grid;
  gap: 6px;
}

label {
  font-size: 14px;
  color: var(--muted);
}

.hint {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

input,
select {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font-family: inherit;
}

input:focus,
select:focus {
  outline: 1px solid rgba(224, 180, 164, 0.7);
}

.extras {
  display: grid;
  gap: 12px;
}

.extras-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.small {
  font-size: 13px;
  color: var(--muted);
}

.empty {
  color: var(--muted);
  font-size: 14px;
  border: 1px dashed var(--border);
  padding: 12px;
  border-radius: 10px;
}

.guest {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}

.guest-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.submit {
  display: grid;
  gap: 10px;
}

.message {
  font-size: 14px;
}

.message.success {
  color: #197247;
}

.message.error {
  color: #ad2b42;
}
</style>
