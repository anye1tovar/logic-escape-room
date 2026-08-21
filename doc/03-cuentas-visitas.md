# Módulo 03 — Cuentas / visitas de clientes

## Objetivo

Crear la entidad operativa que representa a un grupo durante su estancia en Logic y que luego agrupará sala, cafetería y pagos.

Nombre técnico recomendado: `VisitAccount` para diferenciarla de `FinancialAccount`.

---

## Tipos de origen

Una visita puede crearse:

1. desde una reserva existente;
2. manualmente para cafetería/mesa/mostrador/evento.

---

## Crear desde reserva

En la reserva agregar botón:

`Abrir cuenta`

La visita queda relacionada con la reserva y utiliza su información:

- reserva;
- cliente/nombre si existe;
- sala;
- fecha/hora;
- cantidad de personas si existe;
- valor de la sala;
- pagos previos ya registrados.

**Regla crítica:** abrir la visita no vuelve a generar ingresos por los abonos anteriores.

Una reserva solo puede tener una visita activa asociada en el MVP.

---

## Crear visita manual

Formulario mínimo:

- `displayName` — opcional;
- ubicación/tipo — opcional: Mesa 1, Mesa 2, Mostrador, Evento, Otra;
- observación — opcional.

El nombre es deseable pero **no obligatorio** porque durante alta afluencia el flujo debe ser rápido.

Si no hay nombre, usar fallback de UI:

`Cuenta #<id>`

El nombre puede editarse mientras la visita esté abierta.

---

## Estados

Mínimos:

- `OPEN`
- `PARTIALLY_PAID`
- `PAID`
- `CLOSED`
- `CANCELLED`

Reglas:

1. `OPEN`: saldo pendiente > 0 y sin pagos parciales relevantes.
2. `PARTIALLY_PAID`: existe pago pero queda saldo.
3. `PAID`: saldo pendiente = 0.
4. `CLOSED`: cierre operativo explícito.
5. No cerrar normalmente con saldo pendiente.
6. Excepción solo con permiso administrativo y motivo.

---

## Información mostrada

En lista de cuentas abiertas:

- nombre/fallback;
- sala/mesa/ubicación;
- referencia a reserva cuando exista;
- hora de apertura;
- total;
- pagado;
- pendiente;
- estado.

Ejemplos:

- `Natalia · Caníbal · Reserva #452`
- `Andrea · Mesa 2`
- `Cuenta #194 · Mostrador`

---

## Actualización entre usuarios

No implementar tiempo real.

La pantalla debe:

- cargar al entrar;
- tener botón `Actualizar`;
- mostrar opcionalmente `Actualizado hace X min`;
- refetch después de una mutación del usuario actual;
- opcionalmente refetch al recuperar foco.

No hacer polling continuo.

---

## Reglas técnicas

Campos sugeridos:

- `id`
- `reservationId` opcional
- `displayName` opcional
- `locationLabel` opcional
- `status`
- `openedAt`
- `closedAt` opcional
- `openedBy`
- `notes` opcional

No duplicar todos los datos de la reserva si pueden consultarse por relación. Solo snapshotear información que realmente deba conservarse históricamente.

Usar constraint/validación para evitar dos visitas activas para la misma reserva.

---

## Fuera de alcance

- productos/pedidos (Módulo 04);
- cobros de visita (Módulo 05);
- tiempo real.

---

## Criterios de aceptación

1. Desde reserva #452 se pulsa `Abrir cuenta`.
2. Se crea una única visita relacionada.
3. La visita muestra los $80.000 de abonos previos como dinero ya pagado, sin duplicar ingresos.
4. Se crea manualmente una cuenta `Andrea · Mesa 2`.
5. Se crea otra sin nombre y aparece como `Cuenta #...`.
6. Otro usuario necesita pulsar `Actualizar` o volver a enfocar la página para verla.
