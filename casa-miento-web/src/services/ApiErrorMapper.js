import {
  ApiRequestError,
  AppError,
  ConfigMissingError,
  DatabaseUnavailableError,
  NetworkError,
  UnauthorizedError,
} from '../domain/AppError.js';

export class ApiErrorMapper {
  static async fromResponse(response, defaultMessage) {
    const detail = await response.json().catch(() => ({}));
    const hint = detail?.hint;
    const code = detail?.code;

    if (code === 'CONFIG_MISSING') {
      return new ConfigMissingError();
    }

    if (response.status === 401) {
      return new UnauthorizedError();
    }

    if (code === 'DB_HOST_NOT_FOUND') {
      return new DatabaseUnavailableError(
        'No se pudo obtener el resumen porque el host de base de datos no se pudo resolver.',
        hint || 'Revisa DB_URL y la resolucion DNS del entorno de backend.',
        response.status
      );
    }

    if (code === 'DB_CONNECTION_REFUSED') {
      return new DatabaseUnavailableError(
        'No se pudo obtener el resumen porque la base de datos rechazo la conexion.',
        hint || 'Revisa host, puerto y disponibilidad de la base de datos.',
        response.status
      );
    }

    if (code === 'DB_TIMEOUT' || code === 'DB_CONNECTION_ERROR') {
      return new DatabaseUnavailableError(
        'No se pudo obtener el resumen por un problema de conectividad con la base de datos.',
        hint || 'Revisa conectividad de red y valores de DB_URL.',
        response.status
      );
    }

    if (code === 'DB_AUTH_FAILED') {
      return new DatabaseUnavailableError(
        'No se pudo obtener el resumen por credenciales invalidas de base de datos.',
        hint || 'Revisa usuario y password incluidos en DB_URL.',
        response.status
      );
    }

    if (code === 'DB_DATABASE_NOT_FOUND') {
      return new DatabaseUnavailableError(
        'No se pudo obtener el resumen porque la base configurada no existe.',
        hint || 'Revisa el nombre de base en DB_URL.',
        response.status
      );
    }

    if (code === 'DB_QUERY_FAILED') {
      return new ApiRequestError(
        'No se pudo obtener el resumen por un error de consulta en backend.',
        response.status,
        'Error en backend',
        hint || 'La query o el esquema de base devolvieron un error.'
      );
    }

    if (code === 'INTERNAL_SERVER_ERROR') {
      return new ApiRequestError(
        'No se pudo obtener el resumen por un error interno del backend.',
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
