import {
  ApiRequestError,
  AppError,
  ConfigMissingError,
  DatabaseUnavailableError,
  NetworkError,
  SavedButEmailFailedError,
  UnauthorizedError,
} from '../domain/AppError.js';

export class ApiErrorMapper {
  static async fromResponse(response, defaultMessage) {
    const detail = await response.json().catch(() => ({}));
    const hint = detail?.hint;
    const code = detail?.code;
    const contextualMessage = (suffix) => {
      const base = (defaultMessage || 'No se pudo completar la accion.')
        .trim()
        .replace(/[.]+$/, '');
      return `${base}. ${suffix}`;
    };

    if (code === 'CONFIG_MISSING') {
      return new ConfigMissingError();
    }

    if (response.status === 401) {
      return new UnauthorizedError();
    }

    if (code === 'RSVP_SAVED_EMAIL_FAILED') {
      return new SavedButEmailFailedError(
        hint || detail?.hint || 'La respuesta ya quedo guardada. No reenvies el formulario.',
        response.status
      );
    }

    if (code === 'DB_HOST_NOT_FOUND') {
      return new DatabaseUnavailableError(
        contextualMessage('No se pudo resolver el host de base de datos.'),
        hint || 'Revisa DB_URL y la resolucion DNS del entorno de backend.',
        response.status
      );
    }

    if (code === 'DB_CONNECTION_REFUSED') {
      return new DatabaseUnavailableError(
        contextualMessage('La base de datos rechazo la conexion.'),
        hint || 'Revisa host, puerto y disponibilidad de la base de datos.',
        response.status
      );
    }

    if (code === 'DB_TIMEOUT' || code === 'DB_CONNECTION_ERROR') {
      return new DatabaseUnavailableError(
        contextualMessage('Hubo un problema de conectividad con la base de datos.'),
        hint || 'Revisa conectividad de red y valores de DB_URL.',
        response.status
      );
    }

    if (code === 'DB_AUTH_FAILED') {
      return new DatabaseUnavailableError(
        contextualMessage('Las credenciales de base de datos son invalidas.'),
        hint || 'Revisa usuario y password incluidos en DB_URL.',
        response.status
      );
    }

    if (code === 'DB_DATABASE_NOT_FOUND') {
      return new DatabaseUnavailableError(
        contextualMessage('La base configurada no existe.'),
        hint || 'Revisa el nombre de base en DB_URL.',
        response.status
      );
    }

    if (code === 'DB_QUERY_FAILED') {
      return new ApiRequestError(
        contextualMessage('El backend devolvio un error de consulta.'),
        response.status,
        'Error en backend',
        hint || 'La query o el esquema de base devolvieron un error.'
      );
    }

    if (code === 'DB_SCHEMA_MISMATCH') {
      return new ApiRequestError(
        contextualMessage('El backend detecto un esquema de base de datos incompatible.'),
        response.status,
        'Esquema incompatible',
        hint || 'Este proyecto requiere recrear la base de datos ante cambios de modelo.'
      );
    }

    if (code === 'INTERNAL_SERVER_ERROR') {
      return new ApiRequestError(
        contextualMessage('Ocurrio un error interno en el backend.'),
        response.status,
        'Error interno',
        hint || 'El servidor tuvo un fallo inesperado.'
      );
    }

    return new ApiRequestError(
      detail?.error || defaultMessage,
      response.status,
      'No se pudo completar la accion',
      hint || detail?.error || defaultMessage
    );
  }

  static fromUnknown(error, defaultMessage) {
    if (error instanceof AppError) {
      return error;
    }

    const text = error?.message || defaultMessage;
    return new NetworkError(text);
  }
}
