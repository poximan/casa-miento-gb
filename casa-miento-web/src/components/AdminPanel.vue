<template>
  <div class="card admin">
    <div class="badge">Panel organizador</div>

    <div v-if="!loggedIn" class="login">
      <p>Acceso privado para ver confirmaciones.</p>
      <div class="grid-two">
        <div class="field">
          <label>Usuario</label>
          <input v-model="username" type="text" autocomplete="username" />
        </div>
        <div class="field">
          <label>Clave</label>
          <input v-model="password" type="password" autocomplete="current-password" />
        </div>
      </div>
      <button class="primary-btn" @click="login">Ingresar</button>
      <div v-if="panelError" class="error">{{ panelError }}</div>
    </div>

    <div v-else class="summary">
      <div class="summary-head">
        <h3>Resumen de respuestas</h3>
        <div class="actions">
          <button class="ghost-btn" @click="logout">Salir</button>
          <button class="primary-btn" @click="fetchSummary()" :disabled="loading">
            {{ loading ? 'Actualizando...' : 'Refrescar' }}
          </button>
        </div>
      </div>

      <div v-if="panelError" class="error">{{ panelError }}</div>

      <div class="stats">
        <div class="stat">
          <div class="label">Si</div>
          <div class="value">{{ summary.yes }}</div>
        </div>
        <div class="stat">
          <div class="label">No</div>
          <div class="value">{{ summary.no }}</div>
        </div>
        <div class="stat">
          <div class="label">Total personas</div>
          <div class="value">{{ summary.people }}</div>
        </div>
      </div>

      <p class="muted">Pendientes no se calculan porque no hay base previa de invitados.</p>

      <div class="table">
        <div class="table-head">
          <button class="head-btn" @click="setSort('name')">
            Nombre
            <span class="sort">{{ sortIndicator('name') }}</span>
          </button>
          <button class="head-btn" @click="setSort('attending')">
            Estado
            <span class="sort">{{ sortIndicator('attending') }}</span>
          </button>
          <button class="head-btn" @click="setSort('primary_menu')">
            Menu
            <span class="sort">{{ sortIndicator('primary_menu') }}</span>
          </button>
          <button class="head-btn" @click="setSort('created_at')">
            Fecha
            <span class="sort">{{ sortIndicator('created_at') }}</span>
          </button>
        </div>

        <div v-if="!summary.rows.length" class="empty">Sin respuestas aun.</div>

        <template v-for="row in sortedRows" :key="row.id">
          <div class="table-row parent">
            <span>{{ row.primary_first_name }} {{ row.primary_last_name }}</span>
            <span :class="row.attending ? 'yes' : 'no'">{{ row.attending ? 'Si' : 'No' }}</span>
            <span>{{ formatMenu(row.primary_menu) }}</span>
            <span>{{ formatDate(row.created_at) }}</span>
          </div>
          <div
            v-for="(guest, idx) in row.extra_guests"
            :key="`${row.id}-extra-${idx}`"
            class="table-row child"
          >
            <span class="child-name">
              <span class="child-prefix">|-</span>
              {{ guest.firstName }} {{ guest.lastName }}
              <span class="child-tag">Invitado extra</span>
            </span>
            <span :class="row.attending ? 'yes' : 'no'">{{ row.attending ? 'Si' : 'No' }}</span>
            <span>{{ formatMenu(guest.menu) }}</span>
            <span>{{ formatDate(row.created_at) }}</span>
          </div>
        </template>
      </div>
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
  adminUser: {
    type: String,
    default: '',
  },
  adminPassword: {
    type: String,
    default: '',
  },
});

const { modal, openForError, closeModal } = useErrorModal();

const username = ref(props.adminUser || '');
const password = ref(props.adminPassword || '');
const panelError = ref('');
const loading = ref(false);
const loggedIn = ref(false);

const summary = reactive({
  yes: 0,
  no: 0,
  people: 0,
  rows: [],
});

const sortState = reactive({
  key: 'created_at',
  dir: 'desc',
});

const valueForSort = (row, key) => {
  switch (key) {
    case 'name':
      return `${row.primary_first_name || ''} ${row.primary_last_name || ''}`.trim().toLowerCase();
    case 'attending':
      return row.attending ? 1 : 0;
    case 'primary_menu':
      return (row.primary_menu || '').toLowerCase();
    case 'created_at':
      return new Date(row.created_at).getTime();
    default:
      return row[key] ?? '';
  }
};

const sortedRows = computed(() => {
  const rows = Array.isArray(summary.rows) ? [...summary.rows] : [];
  rows.sort((a, b) => {
    const va = valueForSort(a, sortState.key);
    const vb = valueForSort(b, sortState.key);
    if (va < vb) return sortState.dir === 'asc' ? -1 : 1;
    if (va > vb) return sortState.dir === 'asc' ? 1 : -1;
    return 0;
  });
  return rows;
});

const setSort = (key) => {
  if (sortState.key === key) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.key = key;
    sortState.dir = key === 'created_at' ? 'desc' : 'asc';
  }
};

const sortIndicator = (key) => {
  if (sortState.key !== key) return '';
  return sortState.dir === 'asc' ? '^' : 'v';
};

const getToken = () => `${username.value.trim()}:${password.value}`;

const login = async () => {
  if (!username.value.trim() || !password.value) {
    panelError.value = 'Completa usuario y clave.';
    return;
  }

  panelError.value = '';
  loggedIn.value = true;

  const ok = await fetchSummary(true);
  if (!ok) {
    loggedIn.value = false;
  }
};

const logout = () => {
  loggedIn.value = false;
  panelError.value = '';
};

const fetchSummary = async (fromLogin = false) => {
  if (!loggedIn.value && !fromLogin) return false;

  loading.value = true;
  try {
    const response = await fetch('/api/admin-summary', {
      headers: { 'x-admin-token': getToken() },
    });

    if (!response.ok) {
      const mapped = await ApiErrorMapper.fromResponse(response, 'No se pudo obtener el resumen.');
      openForError(mapped);
      throw mapped;
    }

    panelError.value = '';
    const data = await response.json();

    summary.yes = data.yes || 0;
    summary.no = data.no || 0;
    summary.people = data.people || 0;
    summary.rows = (data.rows || []).map((row) => ({
      ...row,
      email: row.email || '',
      extra_guests: Array.isArray(row.extra_guests) ? row.extra_guests : [],
    }));

    return true;
  } catch (errorCaught) {
    const mapped = errorCaught instanceof AppError
      ? errorCaught
      : ApiErrorMapper.fromUnknown(errorCaught, 'No se pudo obtener el resumen.');

    if (!(errorCaught instanceof AppError)) {
      openForError(mapped);
    }

    panelError.value = mapped.message;
    return false;
  } finally {
    loading.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatMenu = (menu) => {
  if (!menu) return 'Clasico';
  const normalized = menu.toLowerCase();
  const map = {
    clasico: 'Clasico',
    vegetariano: 'Vegetariano',
    celiaco: 'Celiaco',
    infantil: 'Infantil',
  };
  return map[normalized] || menu;
};
</script>

<style scoped>
.admin {
  display: grid;
  gap: 14px;
}

.login,
.summary {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

label {
  color: var(--muted);
  font-size: 14px;
}

input {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
}

.error {
  color: #ad2b42;
  font-size: 14px;
  font-weight: 600;
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 10px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.stat {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
}

.label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.value {
  font-size: 22px;
  font-weight: 700;
  margin-top: 4px;
}

.muted {
  color: var(--muted);
  font-size: 13px;
}

.table {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1fr 1.3fr;
  gap: 12px;
  padding: 12px;
}

.table-head {
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 13px;
}

.table-row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.02);
}

.head-btn {
  background: transparent;
  border: none;
  color: inherit;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font: inherit;
  text-align: left;
  padding: 0;
  cursor: pointer;
}

.head-btn:hover {
  color: var(--accent);
}

.sort {
  font-size: 12px;
}

.table-row.child {
  background: rgba(255, 255, 255, 0.08);
  font-size: 14px;
}

.child-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.child-prefix {
  font-size: 16px;
  color: var(--muted);
}

.child-tag {
  font-size: 12px;
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.yes {
  color: #0b8a5a;
}

.no {
  color: #ad2b42;
}

.empty {
  padding: 12px;
  color: var(--muted);
}

@media (max-width: 720px) {
  .table-head,
  .table-row {
    grid-template-columns: 1.5fr 0.7fr 0.9fr 1.1fr;
    font-size: 14px;
  }
}
</style>
