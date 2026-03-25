<template>
  <main class="page">
    <div class="top-nav">
      <RouterLink to="/" class="ghost-btn">Invitado</RouterLink>
      <RouterLink to="/admin" class="ghost-btn">Organizador</RouterLink>
    </div>
    <section v-if="!token" class="card admin-hero">
      <div>
        <div class="badge">Panel organizador</div>
        <h1>Acceso privado</h1>
        <p class="muted">Ingresa usuario y clave para continuar.</p>
      </div>

      <form class="login-form" @submit.prevent="login">
        <div class="grid-two">
          <div class="field">
            <label>Usuario</label>
            <input v-model="username" type="text" autocomplete="username" required />
          </div>
          <div class="field">
            <label>Clave</label>
            <input v-model="password" type="password" autocomplete="current-password" required />
          </div>
        </div>
        <div class="actions">
          <button class="primary-btn" type="submit" :disabled="loginLoading">
            {{ loginLoading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </div>
        <div v-if="loginError" class="error">{{ loginError }}</div>
      </form>
    </section>

    <section v-else class="card admin-hero ready-card">
      <div>
        <div class="badge success-badge">Sesion iniciada</div>
        <h1>Panel listo</h1>
        <p class="muted">Estamos cargando la informacion del evento.</p>
      </div>
      <div class="actions">
        <button class="ghost-btn" type="button" @click="logout">Cerrar sesion</button>
      </div>
    </section>

    <div v-if="token" ref="panelContainer">
      <AdminPanel :token="token" @logout="logout" />
    </div>
  </main>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AdminPanel from '../components/AdminPanel.vue';
import { ApiErrorMapper } from '../services/ApiErrorMapper.js';

const username = ref('admin');
const password = ref('evelindamian');
const token = ref('');
const loginError = ref('');
const loginLoading = ref(false);
const panelContainer = ref(null);

// Siempre exigir login fresco
onMounted(() => {
  token.value = '';
  localStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminToken');
});

const login = async () => {
  loginError.value = '';
  loginLoading.value = true;
  try {
    const response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim(), password: password.value }),
    });

    if (!response.ok) {
      throw await ApiErrorMapper.fromResponse(response, 'No se pudo iniciar sesion.');
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('[admin-login][client] Respuesta no es JSON valido.', parseErr);
      throw new Error('Respuesta inesperada del servidor (JSON invalido).');
    }

    if (!data?.token || typeof data.token !== 'string') {
      console.error('[admin-login][client] Falta token en respuesta de login.', data);
      throw new Error('El servidor no devolvio el token de acceso.');
    }

    console.info('[admin-login][client] Login exitoso, token recibido.');
    token.value = data.token;
    await nextTick();
    panelContainer.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    const mapped = ApiErrorMapper.fromUnknown(err, 'No se pudo iniciar sesion.');
    console.error('[admin-login][client] Fallo inicio de sesion.', mapped);
    if (mapped.code === 'CONFIG_MISSING') {
      window.alert(mapped.detail || mapped.message);
    }
    token.value = '';
    loginError.value = mapped.message;
  } finally {
    loginLoading.value = false;
  }
};

const logout = () => {
  token.value = '';
  localStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminToken');
};
</script>

<style scoped>
.admin-hero {
  display: grid;
  gap: 14px;
}

.top-nav {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 12px;
}

.login-form {
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

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.error {
  color: #ad2b42;
  font-weight: 600;
}

.success {
  color: #0b8a5a;
  font-weight: 600;
}

.ready-card {
  margin-top: 16px;
}

.success-badge {
  background: rgba(11, 138, 90, 0.1);
  border-color: rgba(11, 138, 90, 0.3);
  color: #0b8a5a;
}
</style>
