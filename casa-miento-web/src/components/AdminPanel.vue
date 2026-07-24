<template>
  <div class="card admin">
    <div class="header">
      <div class="badge">Resumen de respuestas</div>
      <div class="actions">
        <button class="primary-btn" type="button" @click="fetchSummary" :disabled="loading">
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

  <div class="card admin photos-card">
    <div class="header">
      <div class="badge">Fotos del carrusel</div>
    </div>

    <div class="picker-row inline">
      <button class="primary-btn" type="button" @click="triggerUpload" :disabled="uploading || uploaderUnavailable">
        {{ uploading ? 'Subiendo...' : 'Seleccionar imagenes' }}
      </button>
      <button class="ghost-btn" type="button" @click="clearSelection">Borrar seleccionadas</button>
      <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFiles" />
    </div>

    <div class="cloud-block">
      <div class="cloud-header">
        <div class="selected-title">Imagenes preparadas para publicar</div>
        <div class="cloud-actions">
          <button class="primary-btn ghost" type="button" @click="addSelectedFromCloud" :disabled="!selectedCloud.size">
            Agregar seleccionadas
          </button>
          <button class="ghost-btn danger" type="button" @click="deleteSelectedFromCloud" :disabled="!selectedCloud.size">
            Eliminar de Cloudinary
          </button>
        </div>
      </div>

      <div class="chips" v-if="photosPreview.length">
        <span class="chip" v-for="url in photosPreview" :key="url">{{ url }}</span>
      </div>

      <div class="assets-list">
        <div v-if="cloudLoading" class="muted small">Cargando assets...</div>
        <div v-else-if="cloudError" class="error">{{ cloudError }}</div>
        <div v-else-if="!cloudAssets.length" class="muted small">No hay imagenes en Cloudinary.</div>
        <div v-else class="asset-grid">
          <label class="asset-card" v-for="asset in cloudAssets" :key="asset.publicId">
            <input
              type="checkbox"
              :value="asset.publicId"
              :checked="selectedCloud.has(asset.publicId)"
              @change="toggleCloudSelection(asset.publicId)"
            />
            <img :src="asset.url" alt="" />
            <span class="asset-id">{{ asset.publicId }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="actions solo">
      <button class="primary-btn" type="button" @click="savePhotos" :disabled="savingPhotos || !photosDraft.trim()">
        {{ savingPhotos ? 'Guardando...' : 'Publicar imagenes' }}
      </button>
    </div>

    <div v-if="photosError" class="error">{{ photosError }}</div>
    <div v-if="photosSaved" class="success">Lista de fotos actualizada ({{ photosPreview.length }} items).</div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ApiErrorMapper } from '../services/ApiErrorMapper.js';

const props = defineProps({
  token: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['logout']);

const panelError = ref('');
const loading = ref(false);

const photosError = ref('');
const photosSaved = ref(false);
const savingPhotos = ref(false);
const photosDraft = ref('');
const uploading = ref(false);
const uploaderUnavailable = ref(false);
const fileInput = ref(null);
const cloudAssets = ref([]);
const cloudLoading = ref(false);
const cloudError = ref('');
const selectedCloud = ref(new Set());

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

watch(
  () => props.token,
  (value) => {
    if (value) {
      fetchSummary();
      loadCloudData();
      resetSelection();
    } else {
      summary.rows = [];
      summary.people = 0;
      summary.yes = 0;
      summary.no = 0;
      photosDraft.value = '';
      photosError.value = '';
      photosSaved.value = false;
      cloudAssets.value = [];
      selectedCloud.value = new Set();
    }
  },
  { immediate: true }
);

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

const photosPreview = computed(() =>
  photosDraft.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l)
);

async function loadCloudData() {
  photosError.value = '';
  cloudError.value = '';
  cloudLoading.value = true;
  try {
    const res = await fetch('/api/cloudinary-assets', {
      headers: { Authorization: `Bearer ${props.token}` },
    });
    if (res.status === 401) {
      emit('logout');
      photosError.value = 'Sesion expirada. Volve a iniciar sesion.';
      return;
    }
    if (!res.ok) {
      throw await ApiErrorMapper.fromResponse(res, 'No se pudieron cargar assets de Cloudinary.');
    }
    const data = await res.json();
    uploaderUnavailable.value = false;
    const assets = Array.isArray(data.assets)
      ? data.assets.map((a) => ({
          publicId: a.publicId,
          url: a.url,
        }))
      : [];
    cloudAssets.value = assets;
    selectedCloud.value = new Set();
  } catch (err) {
    const mapped = ApiErrorMapper.fromUnknown(err, 'No se pudo cargar Cloudinary.');
    console.error('[admin-panel] Error cargando Cloudinary.', mapped);
    cloudError.value = mapped.message;
    uploaderUnavailable.value = true;
    if (mapped.code === 'CONFIG_MISSING') {
      window.alert(mapped.detail || mapped.message);
    }
  } finally {
    cloudLoading.value = false;
  }
}

const savePhotos = async () => {
  photosError.value = '';
  photosSaved.value = false;
  const urls = photosPreview.value;
  if (!urls.length) {
    photosError.value = 'Agrega al menos una URL.';
    return;
  }
  if (urls.length > 8) {
    photosError.value = 'Maximo 8 fotos por publicacion.';
    return;
  }
  savingPhotos.value = true;
  try {
    const res = await fetch('/api/admin-photos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ photos: urls }),
    });
    if (res.status === 401) {
      emit('logout');
      photosError.value = 'Sesion expirada. Volve a iniciar sesion.';
      return;
    }
    if (!res.ok) {
      throw await ApiErrorMapper.fromResponse(res, 'No se pudieron guardar las fotos.');
    }
    photosSaved.value = true;
  } catch (err) {
    const mapped = ApiErrorMapper.fromUnknown(err, 'No se pudieron guardar las fotos.');
    photosError.value = mapped.message;
    if (mapped.code === 'CONFIG_MISSING') {
      console.error('[admin-panel] Configuracion faltante guardando fotos.', mapped);
      window.alert(mapped.detail || mapped.message);
    }
  } finally {
    savingPhotos.value = false;
  }
};

const triggerUpload = () => {
  photosError.value = '';
  photosSaved.value = false;
  if (uploaderUnavailable.value) {
    photosError.value = 'El middleware de Cloudinary no esta disponible.';
    return;
  }
  fileInput.value?.click();
};

const handleFiles = async (event) => {
  const files = Array.from(event.target.files || []).filter((f) => f && f.size);
  if (!files.length) return;
  uploading.value = true;
  photosError.value = '';
  photosSaved.value = false;
  try {
    for (const file of files) {
      await uploadToCloudinary(file);
    }
  } catch (err) {
    photosError.value = err?.message || 'No se pudieron subir las imagenes.';
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const uploadToCloudinary = async (file) => {
  const base64Data = await readFileAsBase64(file);
  const res = await fetch('/api/cloudinary-assets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${props.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64Data,
    }),
  });
  if (!res.ok) {
    throw await ApiErrorMapper.fromResponse(res, 'No se pudo subir la imagen via middleware.');
  }
  const data = await res.json();
  const asset = data.asset || {};
  const url = asset.url;
  if (url) {
    const current = photosPreview.value;
    photosDraft.value = [...new Set([...current, url])].join('\n');
    const publicId = asset.publicId;
    if (publicId) {
      cloudAssets.value = [{ publicId, url }, ...cloudAssets.value];
    }
  }
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = result.includes(',') ? result.split(',').pop() : '';
      if (!base64Data) {
        reject(new Error('No se pudo leer la imagen seleccionada.'));
        return;
      }
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });

const clearSelection = () => {
  photosDraft.value = '';
  photosSaved.value = false;
  photosError.value = '';
};

const toggleCloudSelection = (publicId) => {
  const next = new Set(selectedCloud.value);
  if (next.has(publicId)) {
    next.delete(publicId);
  } else {
    next.add(publicId);
  }
  selectedCloud.value = next;
};

const addSelectedFromCloud = () => {
  const idSet = new Set(selectedCloud.value);
  if (!idSet.size) return;
  const urlsToAdd = cloudAssets.value
    .filter((a) => idSet.has(a.publicId))
    .map((a) => (a.url || '').trim())
    .filter(Boolean);
  if (!urlsToAdd.length) return;
  const current = photosPreview.value;
  photosDraft.value = [...new Set([...current, ...urlsToAdd])].join('\n');
  photosSaved.value = false;
};

const deleteSelectedFromCloud = async () => {
  const ids = Array.from(selectedCloud.value);
  if (!ids.length) return;
  cloudError.value = '';
  try {
    const res = await fetch('/api/cloudinary-assets', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicIds: ids }),
    });
    if (res.status === 401) {
      emit('logout');
      return;
    }
    if (!res.ok) {
      throw await ApiErrorMapper.fromResponse(res, 'No se pudieron borrar los assets.');
    }
    await loadCloudData();
  } catch (err) {
    const mapped = ApiErrorMapper.fromUnknown(err, 'No se pudieron borrar los assets.');
    cloudError.value = mapped.message;
    if (mapped.code === 'CONFIG_MISSING') {
      console.error('[admin-panel] Configuracion faltante borrando assets.', mapped);
      window.alert(mapped.detail || mapped.message);
    }
  }
};

const resetSelection = () => {
  photosDraft.value = '';
  photosSaved.value = false;
  photosError.value = '';
};

async function fetchSummary() {
  if (!props.token) return;

  loading.value = true;
  try {
    const response = await fetch('/api/admin-summary', {
      headers: { Authorization: `Bearer ${props.token}` },
    });

    if (response.status === 401) {
      emit('logout');
      panelError.value = 'Sesion expirada. Volve a iniciar sesion.';
      return;
    }

    if (!response.ok) {
      throw await ApiErrorMapper.fromResponse(response, 'No se pudo obtener el resumen.');
    }

    panelError.value = '';
    const data = await response.json();
    summary.yes = data.yes;
    summary.no = data.no;
    summary.people = data.people;
    summary.rows = (data.rows || []).map((row) => ({
      ...row,
      email: row.email || '',
      extra_guests: Array.isArray(row.extra_guests) ? row.extra_guests : [],
    }));
  } catch (error) {
    const mapped = ApiErrorMapper.fromUnknown(error, 'No se pudo obtener el resumen.');
    console.error('[admin-panel] Error obteniendo resumen.', mapped);
    panelError.value = mapped.message;
    if (mapped.code === 'CONFIG_MISSING') {
      window.alert(mapped.detail || mapped.message);
    }
  } finally {
    loading.value = false;
  }
}

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

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.error {
  color: #ad2b42;
  font-size: 14px;
  font-weight: 600;
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

.photos-card {
  display: grid;
  gap: 10px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.success {
  color: #0b8a5a;
  font-size: 14px;
  font-weight: 600;
}

.picker-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker-row.inline {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.muted.small {
  font-size: 13px;
  color: var(--muted);
}

.hidden {
  display: none;
}

.selected-title {
  margin-top: 8px;
  font-weight: 600;
  color: var(--muted);
}

.actions.solo {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.cloud-block {
  display: grid;
  gap: 10px;
  margin-top: 6px;
}

.cloud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.cloud-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.assets-list {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.asset-card {
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.asset-card img {
  width: 100%;
  height: 140px;
  object-fit: contain;
  border-radius: 8px;
}

.asset-id {
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
}

.ghost.danger {
  border-color: #ad2b42;
  color: #ad2b42;
}
</style>
