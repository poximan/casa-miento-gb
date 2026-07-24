const isNodeNetworkCode = (code) =>
  code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EHOSTUNREACH';

const mapNodeNetworkError = (error) => {
  if (!error || !isNodeNetworkCode(error.code)) return null;

  if (error.code === 'ENOTFOUND') {
    return {
      status: 503,
      code: 'DB_HOST_NOT_FOUND',
      error: 'No se pudo resolver el host de la base de datos.',
      hint: 'Revisa DB_URL: host valido y resolucion DNS del entorno.',
    };
  }

  if (error.code === 'ECONNREFUSED') {
    return {
      status: 503,
      code: 'DB_CONNECTION_REFUSED',
      error: 'La base de datos rechazo la conexion.',
      hint: 'Revisa DB_URL y que la base este levantada y escuchando el puerto configurado.',
    };
  }

  if (error.code === 'ETIMEDOUT') {
    return {
      status: 503,
      code: 'DB_TIMEOUT',
      error: 'Timeout al conectar con la base de datos.',
      hint: 'Revisa latencia/red y accesibilidad al host de DB.',
    };
  }

  return {
    status: 503,
    code: 'DB_CONNECTION_ERROR',
    error: 'No se pudo establecer conexion con la base de datos.',
    hint: 'Revisa conectividad y valores de DB_URL.',
  };
};

const mapPostgresError = (error) => {
  if (!error?.code || error.code.length !== 5) return null;

  if (error.code === '28P01') {
    return {
      status: 503,
      code: 'DB_AUTH_FAILED',
      error: 'No se pudo autenticar contra la base de datos.',
      hint: 'Revisa usuario/password de DB en DB_URL.',
    };
  }

  if (error.code === '3D000') {
    return {
      status: 503,
      code: 'DB_DATABASE_NOT_FOUND',
      error: 'La base de datos indicada no existe.',
      hint: 'Revisa el nombre de base en DB_URL.',
    };
  }

  if (error.code.startsWith('08')) {
    return {
      status: 503,
      code: 'DB_CONNECTION_ERROR',
      error: 'No se pudo establecer conexion con la base de datos.',
      hint: 'Revisa conectividad, host y puerto de DB_URL.',
    };
  }

  return {
    status: 500,
    code: 'DB_QUERY_FAILED',
    error: 'La base de datos devolvio un error al ejecutar la consulta.',
    hint: 'Revisa el estado del esquema y la query del backend.',
  };
};

export const mapOperationalError = (error) => {
  if (error?.code === 'DB_SCHEMA_MISMATCH') {
    return {
      status: 500,
      code: 'DB_SCHEMA_MISMATCH',
      error: 'El esquema de base de datos no coincide con la version actual del backend.',
      hint: 'Este proyecto no migra datos en caliente. Recrea la base de datos y vuelve a cargarla.',
    };
  }

  if (typeof error?.code === 'string' && error.code.startsWith('CLOUDINARY_')) {
    return {
      status: error.status || 502,
      code: error.code,
      error: error.publicMessage || 'No se pudo completar la operacion con Cloudinary.',
      hint: error.hint || 'Revisa configuracion y disponibilidad de Cloudinary.',
    };
  }

  const nodeNetwork = mapNodeNetworkError(error);
  if (nodeNetwork) return nodeNetwork;

  const postgres = mapPostgresError(error);
  if (postgres) return postgres;

  return {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    error: 'Error interno del servidor.',
    hint: 'Revisa logs del backend para diagnosticar la causa.',
  };
};

export const logOperationalError = (operation, error, mapped) => {
  const payload = {
    operation,
    publicCode: mapped.code,
    publicMessage: mapped.error,
    hint: mapped.hint,
    technical: {
      name: error?.name || 'Error',
      code: error?.code || null,
      syscall: error?.syscall || null,
      hostname: error?.hostname || null,
      message: error?.message || null,
    },
  };

  console.error(`[${operation}] ${mapped.code}: ${mapped.error} | ${mapped.hint}`);
  console.error(`[${operation}] technical-context`, payload);

  if (mapped.code === 'INTERNAL_SERVER_ERROR' && error?.stack) {
    const shortStack = String(error.stack)
      .split('\n')
      .slice(0, 6)
      .join('\n');
    console.error(`[${operation}] stack`, shortStack);
  }
};
