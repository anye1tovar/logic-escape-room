# Módulo 05 — Pagos, caja y cobros divididos

## Objetivo

Permitir cobrar una visita de forma flexible, incluyendo pagos por productos específicos, pagos parciales por valor y múltiples cuentas financieras.

---

## Cuenta destino del dinero

Al cobrar, el usuario selecciona una `FinancialAccount` con `availableForCustomerPayments=true`.

Ejemplos visibles:

- Caja menor
- Nequi Logic
- Daviplata Logic

`Caja fuerte` puede existir sin aparecer en este selector.

No guardar solamente `paymentMethod = CASH`; guardar la cuenta financiera real.

---

## Modelo

### `VisitPayment`

- `id`
- `visitAccountId`
- `amount`
- `financialAccountId`
- `paidAt`
- `createdBy`
- `notes`
- `status`: `CONFIRMED`, `VOIDED`

### `PaymentAllocation`

Permite asignar un pago a uno o varios conceptos/items.

- `paymentId`
- `orderItemId` opcional
- `reservationComponent`/`visitBaseComponent` opcional según modelo existente
- `amount`

El diseño no debe asumir relación 1:1 pago-producto.

---

## Escenario prioritario: pagar productos específicos

Cuenta:

- Nuggets $18.000
- Alascape $22.000
- Coca-Cola $4.000
- Coca-Cola $4.000

Cliente A selecciona Nuggets + 1 Coca-Cola = $22.000 y paga a Nequi.

Los demás conceptos permanecen pendientes.

---

## Pago parcial por valor

También debe soportarse:

- saldo $100.000;
- Persona A paga $30.000;
- Persona B paga $35.000;
- Persona C paga $35.000.

El sistema no debe obligar a que cada pago corresponda a items completos.

Para el MVP, si un pago no se asigna completamente a items, puede existir una asignación genérica al saldo de la visita.

---

## Integración con abonos previos

Cuando la visita proviene de una reserva:

- los `ReservationPayment` previos forman parte de `totalPaid` de la visita;
- no se crean de nuevo;
- se pueden mostrar como `Pagos previos de reserva`.

Ejemplo:

Sala $144.000 + cafetería $26.000 = $170.000
Abonos previos = $72.000
Pendiente = $98.000

---

## Movimiento financiero

Confirmar un `VisitPayment` genera atómicamente:

`FinancialMovement INCOME`

con:

- cuenta destino;
- valor;
- source `VISIT_PAYMENT`;
- referencia al pago/visita.

Agregar productos sin cobrar **no genera** movimiento financiero.

---

## Estados de la visita

Después de cada pago recalcular:

- `OPEN` / `PARTIALLY_PAID` / `PAID`.

`PAID` cuando saldo = 0.

Cerrar la visita sigue siendo una acción explícita.

---

## Anulación

Un pago confirmado no se borra físicamente.

Anulación requiere:

- permiso;
- motivo;
- marcar pago `VOIDED`;
- revertir/compensar el movimiento financiero;
- liberar las asignaciones correspondientes;
- recalcular saldo de visita.

---

## UI mínima de caja

Detalle de visita:

- conceptos;
- vendidos/cortesía;
- pagado/pendiente;
- pagos previos;
- historial de pagos;
- botón `Cobrar`.

En `Cobrar`:

1. seleccionar items o ingresar valor;
2. ver total;
3. elegir cuenta destino;
4. confirmar.

---

## Reglas técnicas

- `VisitPayment + PaymentAllocation + FinancialMovement` en transacción atómica.
- Backend impide sobreasignar un item/saldo.
- Usar control de concurrencia para dos cajeros cobrando simultáneamente.
- Idempotencia si la arquitectura actual lo permite, para evitar doble cobro por doble clic/retry.

---

## Fuera de alcance

- factura electrónica;
- datáfono integrado;
- QR dinámicos;
- propinas.

---

## Criterios de aceptación

1. Visita con abono previo $72.000 y saldo $98.000.
2. Cliente paga Nuggets + Coca-Cola por $22.000 a Nequi.
3. Nequi aumenta exactamente $22.000.
4. Otros productos siguen pendientes.
5. Segundo cliente paga otro valor en Caja menor.
6. Al llegar saldo a $0, visita queda `PAID`.
7. Ningún abono previo se duplica.
