export class AppError extends Error {
  constructor({ code, message, title, detail, status = null }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.status = status;
  }
}

export class ConfigMissingError extends AppError {
  constructor() {
    super({
      code: 'CONFIG_MISSING',
      message: 'Configuracion incompleta del servicio.',
      title: 'Configuracion incompleta',
      detail: 'Falta configuracion obligatoria del servidor. No es posible continuar.',
      status: 500,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super({
      code: 'UNAUTHORIZED',
      message: 'No autorizado. Revisa usuario y clave de organizador.',
      title: 'Acceso denegado',
      detail: 'Las credenciales de organizador no fueron aceptadas.',
      status: 401,
    });
  }
}

export class ApiRequestError extends AppError {
  constructor(message, status = null, title = 'No se pudo completar la accion', detail = null) {
    super({
      code: 'API_REQUEST_FAILED',
      message,
      title,
      detail: detail || message,
      status,
    });
  }
}

export class SavedButEmailFailedError extends AppError {
  constructor(detail = null, status = 502) {
    super({
      code: 'RSVP_SAVED_EMAIL_FAILED',
      message: 'La respuesta se guardo, pero no se pudo enviar el email de confirmacion.',
      title: 'Respuesta guardada con incidencia',
      detail: detail || 'La respuesta ya quedo guardada. No reenvies el formulario.',
      status,
    });
  }
}

export class NetworkError extends AppError {
  constructor(message) {
    super({
      code: 'NETWORK_ERROR',
      message,
      title: 'Problema de conexion',
      detail: 'No se pudo conectar con el servidor. Revisa red o backend.',
    });
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message, detail, status = 503) {
    super({
      code: 'DB_UNAVAILABLE',
      message,
      title: 'Base de datos no disponible',
      detail,
      status,
    });
  }
}
