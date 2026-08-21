# Módulo 02 — Abonos flexibles de reservas

## Objetivo

Permitir registrar pagos previos asociados a reservas ya existentes, sin crear una cuenta/visita antes de que el cliente llegue.

---

## Cambios en la reserva existente

En la lista y/o detalle de cada reserva agregar:

- `Registrar abono`
- posteriormente `Abrir cuenta` (se implementa en Módulo 03)

La reserva debe mostrar:

- valor total de la reserva;
- total pagado;
- saldo pendiente;
- historial de pagos/abonos.

---

## Registro de abono

El valor es **completamente flexible**.

No asumir 50%.

Ejemplos válidos:

- $50.000;
- $72.000;
- $100.000;
- el valor total de la reserva.

Campos mínimos:

- `reservationId`
- `amount`
- `financialAccountId`
- `paidAt`
- `notes` opcional
- `createdBy`
- `status`: `CONFIRMED`, `VOIDED`

Modelo sugerido: `ReservationPayment`.

---

## Reglas de negocio

1. Una reserva puede tener **múltiples pagos**.
2. No usar un único campo mutable `depositAmount` como histórico.
3. `totalPaid = suma de ReservationPayment confirmados`.
4. `pendingAmount = max(reservationTotal - totalPaid, 0)`.
5. Permitir pago total de una vez.
6. No obligar a que el primer pago sea exactamente 50%.
7. Cada pago debe indicar una `FinancialAccount` disponible para cobros.
8. Registrar un abono genera en la misma operación un `FinancialMovement INCOME` en la cuenta seleccionada.
9. Ese movimiento debe marcar origen `RESERVATION_PAYMENT` y referenciar el pago/reserva.
10. Anular un abono no debe borrarlo: anular/compensar el movimiento financiero y recalcular saldo.
11. No crear una `VisitAccount` solo para registrar un abono desde casa.
12. Si se recibe más dinero que el valor actual de la reserva, el MVP debe advertir y requerir confirmación/permiso administrativo; no asumir automáticamente qué representa el excedente.

---

## UI mínima

### Modal `Registrar abono`

- valor recibido;
- cuenta destino;
- fecha/hora (por defecto ahora, editable si permisos lo permiten);
- observación opcional.

### Historial en detalle de reserva

Mostrar:

| Fecha | Valor | Cuenta destino | Usuario | Estado |

Y resumen:

- Total reserva
- Total pagado
- Pendiente

---

## Reglas técnicas

- Registrar `ReservationPayment` + `FinancialMovement` en una transacción de base de datos.
- El movimiento financiero no debe duplicarse al abrir posteriormente la visita.
- Si el precio de la reserva cambia, no modificar los pagos ya realizados.
- Reutilizar la entidad `Reservation` existente.

---

## Fuera de alcance

- abrir visita (Módulo 03);
- devoluciones complejas;
- pasarela de pago automática;
- conciliación bancaria.

---

## Criterios de aceptación

1. Reserva de $144.000 recibe abono $50.000 en Nequi.
2. Se muestra pagado $50.000, pendiente $94.000.
3. Nequi aumenta $50.000 en su ledger.
4. La misma reserva recibe después $30.000 en Daviplata.
5. Total pagado pasa a $80.000 y pendiente a $64.000.
6. No se crea ninguna visita todavía.
7. Se puede ver el historial de ambos abonos.
