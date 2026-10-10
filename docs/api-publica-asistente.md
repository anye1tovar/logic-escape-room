# API pública para el asistente conversacional de Logic

Esta guía describe las operaciones públicas actuales del backend que podrían usar las herramientas del asistente para consultar información y solicitar reservas. La API está desplegada separada del frontend. La URL base debe configurarse por ambiente, por ejemplo `https://<api-de-produccion>`; no se debe fijar una URL local en el asistente.

> **Estado de seguridad:** estas rutas no exigen autenticación actualmente. CORS restringe navegadores, pero no autentica llamadas de servidor a servidor. La API debe tratarse como accesible por cualquier cliente de Internet mientras no se despliegue una protección adicional. Esta guía no concede permisos nuevos.

## Convenciones

- Prefijo: `/api`.
- Métodos y datos: JSON UTF-8.
- Fechas: `YYYY-MM-DD`, interpretadas en `America/Bogota`.
- Horas de reserva: ISO 8601 con offset de Bogotá (`-05:00`), aunque algunos horarios de apertura se devuelven como `HH:mm`.
- `roomId` para reservar es el identificador público de la sala y no necesariamente el ID numérico de base de datos.
- Respuestas de error: normalmente `{ "error": "..." }`; algunos errores de disponibilidad incluyen además `code`.

## Precios

### `GET /api/rates`

Devuelve las tarifas configuradas. Parámetro opcional:

| Parámetro | Valores | Comportamiento |
| --- | --- | --- |
| `dayType` | `weekday`, `weekend` | Filtra por tipo de día. Si se omite o no coincide, devuelve todas las tarifas. |

Ejemplo: `GET /api/rates?dayType=weekend`

La respuesta es un arreglo de registros de tarifa de base de datos. Actualmente incluye las propiedades configuradas en la tabla `rates` (por ejemplo, tipo de día, cantidad de jugadores, precio por persona y moneda). El esquema público no está normalizado en un DTO versionado; el asistente debería leer el importe como dato informativo y consultar la cotización antes de comunicar un total final.

### `GET /api/bookings/quote?date=YYYY-MM-DD&attendees=N`

Calcula una cotización de acuerdo con la fecha y número de jugadores.

Ejemplo de respuesta:

```json
{
  "date": "2026-10-20",
  "dayType": "weekday",
  "isHoliday": false,
  "players": 4,
  "currency": "COP",
  "pricePerPerson": 50000,
  "total": 200000
}
```

`date` y `attendees` son necesarios. Errores de parámetros o falta de tarifa aplicable devuelven `400`.

## Salas

### `GET /api/rooms`

Devuelve el arreglo de salas configuradas.

### `GET /api/rooms/:id`

Devuelve una sala por ID de base de datos; responde `404` cuando no existe. Esta ruta es útil principalmente para la aplicación interna. Para el flujo público del asistente es preferible obtener las salas de disponibilidad, que incluyen el `roomId` público aceptado al crear una reserva.

La lista actual se basa en `SELECT * FROM rooms`; por ello puede contener campos internos y cambiar con el esquema. Antes de exponerla como fuente de conocimiento externa se recomienda definir y mantener un conjunto explícito de campos públicos (nombre, descripción, capacidad, duración, dificultad e identificador público).

## Horarios de apertura

### `GET /api/bookings/opening-hours`

Devuelve horarios por día de la semana:

```json
[
  {
    "dayOfWeek": 1,
    "openTime": "10:00",
    "closeTime": "21:00",
    "isOpen": true,
    "requiresAdvanceBooking": false
  }
]
```

`dayOfWeek` sigue la numeración JavaScript: domingo `0`, lunes `1`, …, sábado `6`. Para feriados o cierres de una fecha específica, usar disponibilidad por fecha, que aplica el calendario configurado.

## Disponibilidad por fecha

### `GET /api/bookings/availability?date=YYYY-MM-DD`

Devuelve las salas activas y sus espacios de 90 minutos para la fecha. No devuelve nombres ni datos de otras reservas.

Ejemplo reducido:

```json
{
  "date": "2026-10-20",
  "dayType": "weekday",
  "isHoliday": false,
  "rates": [],
  "timezone": "America/Bogota",
  "serverNow": "2026-10-09T12:00:00-05:00",
  "minAdvanceMinutes": 0,
  "rooms": [
    {
      "roomId": "sala-publica",
      "name": "Sala de ejemplo",
      "minPlayers": 2,
      "maxPlayers": 6,
      "durationMinutes": 90,
      "difficulty": "medium",
      "slots": [
        { "start": "2026-10-20T10:00:00-05:00", "available": true },
        { "start": "2026-10-20T11:30:00-05:00", "available": false, "reason": "booked" }
      ]
    }
  ]
}
```

`date` es obligatorio; fechas pasadas devuelven `400`. Si la fecha está cerrada, devuelve `400` con código `DAY_CLOSED`; si no hay horario configurado, `400` con `OPENING_HOURS_MISSING`. Los motivos de slot pueden incluir `booked` y `too_late`. La disponibilidad es una instantánea: debe volver a consultarse y la reserva puede responder `409` si otra persona tomó el espacio entretanto.

Los parámetros `allowPast` y `allowOutOfHours` son opciones internas privilegiadas. No deben ser enviados por el asistente; sin un token privilegiado no conceden esas capacidades.

## Creación de reserva

### `POST /api/bookings`

Solicita una reserva pública. La API valida de nuevo disponibilidad y capacidad al crearla.

Ejemplo de solicitud:

```json
{
  "firstName": "Ana",
  "lastName": "Pérez",
  "whatsapp": "+573001234567",
  "date": "2026-10-20",
  "roomId": "sala-publica",
  "time": "2026-10-20T10:00:00-05:00",
  "attendees": 4,
  "notes": "Preferencia opcional",
  "isFirstTime": true,
  "sendReceipt": true
}
```

Campos requeridos por la validación actual: `date`, `roomId`, `time`; se recomienda enviar también nombre, WhatsApp y `attendees` para completar la reserva. `time` acepta hora `HH:mm` o ISO con fecha y offset. `endTime` es opcional y, si se omite, se calcula como 90 minutos después del inicio. `notes`, `isFirstTime`, `sendReceipt` y `tracking` son opcionales. No enviar `reservationSource: "walk_in"` ni `outOfHours: true`: esas modalidades son privilegiadas.

Respuesta `201`: registro de reserva creado, que actualmente contiene los datos retornados por la persistencia y `reservationCode` (código para consultar el estado). El asistente debe mostrar una confirmación solo cuando reciba `201` y guardar el código de forma segura para entregarlo al usuario.

Errores esperables:

| HTTP | Significado |
| --- | --- |
| `400` | Datos inválidos, fecha pasada, sala/horario inexistente, capacidad inválida o fecha cerrada. |
| `401` / `403` | Se intentó usar una modalidad privilegiada sin permiso. |
| `409` | El horario dejó de estar disponible mientras se completaba el flujo. Consultar disponibilidad de nuevo. |
| `500` | Error inesperado del servidor. No repetir automáticamente la creación sin comprobar si se creó la reserva. |

No hay actualmente una clave de idempotencia documentada. Si ocurre timeout después del envío, no reintentar a ciegas: la primera solicitud podría haber sido procesada.

## Rutas no incluidas en el contrato del asistente

Aunque hoy también responden sin middleware de autenticación en el montaje de rutas, **no deben consumirse desde el asistente**:

- `GET /api/bookings` — listado general de reservas.
- `GET /api/bookings/:id` — consulta por ID de base de datos.
- `GET /api/bookings/consult/:code` — consulta de estado; solo usar si se diseña explícitamente ese flujo y se protege adecuadamente.

La exposición de listado y consulta por ID debe revisarse antes de producción pública. CORS no las protege frente a clientes no navegador.

## Requisitos no funcionales para integrar el proyecto del asistente

Estos son requisitos de integración recomendados; no todos están implementados actualmente en la API:

1. **Autenticación entre servidores.** Emitir una credencial exclusiva para el servicio del asistente, con alcance mínimo (lectura pública y, si se aprueba, creación de reservas), revocación y rotación. Mantenerla en el backend del asistente o en un gestor de secretos. Nunca incluirla en código del frontend, prompts, logs o repositorio. Un ID de proyecto por sí solo no autentica.
2. **Límites de uso y protección de carga.** Configurar rate limits por identidad/IP, límites de concurrencia y tamaño, timeouts y límites de conexión en API gateway/WAF o backend. Definir cuotas específicas para cotizaciones y creación de reservas.
3. **Privacidad y minimización.** No consumir listados generales. Enviar únicamente los datos personales necesarios para reservar, limitar su retención en logs del asistente y no registrar cuerpos completos ni tokens. Los campos de tracking/consentimiento solo deben enviarse según el consentimiento real del usuario.
4. **Control de errores y reintentos.** Manejar `400`, `409` y `5xx` de forma distinta; reconsultar disponibilidad ante conflicto; no repetir `POST` automáticamente tras timeout hasta contar con idempotencia.
5. **Tiempo y formatos.** Interpretar todas las fechas/horas como `America/Bogota`, presentar COP y usar exactamente el `roomId`/`start` retornados por disponibilidad.
6. **Disponibilidad operativa.** Usar HTTPS, monitorear latencia, errores y volumen por cliente, alertar ante picos y mantener una forma de desactivar o revocar la integración sin afectar el sitio.
7. **Contrato estable.** Versionar el contrato (por ejemplo `/api/v1/assistant`) y responder con campos públicos explícitos. Hoy `/api/rooms` y tarifas devuelven registros ligados al esquema de base de datos; esos formatos pueden variar sin aviso.
8. **Pruebas controladas.** Probar en un ambiente no productivo, con datos ficticios, escenarios de fecha cerrada, conflictos simultáneos, capacidad inválida, timeout y credencial revocada antes de habilitar tráfico real.

## Flujo sugerido del asistente

1. Consultar salas y horarios si necesita contexto; consultar cotización y disponibilidad con la fecha/personas elegidas.
2. Mostrar al usuario precio, sala, fecha, hora, duración y política aplicable, y pedir confirmación antes de crear una reserva.
3. Enviar `POST /api/bookings` desde el servidor del asistente.
4. Si responde `201`, confirmar y entregar el `reservationCode`. Si responde `409`, volver a disponibilidad y ofrecer alternativas.

## Fuente de verdad en el código

Rutas: `packages/backend/src/routes/{rates,rooms,bookings}.js`. Controladores: `packages/backend/src/controllers/*Controller.js`. Reglas de horarios, cotización, disponibilidad y reserva: `packages/backend/src/services/bookingService.js` y `ratesService.js`.
