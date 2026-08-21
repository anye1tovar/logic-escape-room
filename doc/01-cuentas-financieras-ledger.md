# Módulo 01 — Cuentas financieras y ledger base

## Objetivo

Crear la base financiera sobre la cual funcionarán pagos, egresos, aportes, transferencias y cierres.

Este módulo se implementa primero porque los abonos de reservas y los cobros posteriores deben indicar **dónde quedó el dinero**.

---

## Alcance MVP

### CRUD administrativo de cuentas financieras

El administrador puede crear y consultar cuentas como:

- Caja menor;
- Caja fuerte;
- Nequi Logic;
- Daviplata Logic;
- Bancolombia;
- otras cuentas futuras.

Campos mínimos sugeridos:

- `id`
- `name`
- `type`: `CASH`, `DIGITAL_WALLET`, `BANK`, `OTHER`
- `active`
- `availableForCustomerPayments`
- `reconciliationEnabled`
- `createdAt`
- `createdBy`

### Saldo inicial

Al crear/inicializar una cuenta se permite registrar:

- valor del saldo inicial;
- fecha del saldo inicial;
- observación opcional.

Esto genera un movimiento `INITIAL_BALANCE`.

Después de la inicialización, **no existe edición directa del saldo**.

---

## Modelo conceptual

```text
FinancialAccount
    └── FinancialMovement
```

`FinancialMovement` debe soportar desde el inicio al menos:

- `INITIAL_BALANCE`
- `INCOME`
- `EXPENSE`
- `TRANSFER_IN`
- `TRANSFER_OUT`
- `OWNER_CONTRIBUTION`
- `ADJUSTMENT`

Campos sugeridos:

- `id`
- `financialAccountId`
- `type`
- `amount`
- `occurredAt`
- `description`
- `sourceType`
- `sourceId` opcional
- `createdBy`
- `createdAt`
- `status`: `ACTIVE`, `VOIDED`

---

## Reglas de negocio

1. El saldo esperado de una cuenta se deriva de sus movimientos activos.
2. No permitir editar el saldo mediante un `UPDATE balance` arbitrario.
3. Una cuenta inactiva no puede recibir nuevos movimientos operativos normales.
4. `availableForCustomerPayments=false` evita que la cuenta aparezca durante el cobro, pero puede seguir existiendo para transferencias/conciliación.
5. Ejemplo: `Caja fuerte` puede estar activa pero no aparecer como destino normal de cobros de clientes.
6. Los movimientos anulados no deben participar en el saldo.
7. La anulación debe dejar trazabilidad; no hacer hard delete.
8. El administrador puede cambiar nombre/configuración de una cuenta, pero no reescribir su historial.

---

## UI mínima

### Pantalla `Cuentas financieras`

Mostrar:

- nombre;
- tipo;
- saldo esperado actual;
- activa/inactiva;
- disponible para cobros sí/no.

Acciones:

- crear;
- editar configuración;
- ver movimientos.

### Pantalla `Movimientos de la cuenta`

Filtros mínimos:

- fecha desde/hasta;
- tipo de movimiento.

No necesita analítica avanzada todavía.

---

## Reglas técnicas

- No almacenar un saldo editable como única fuente de verdad.
- Si se mantiene un campo cacheado de saldo por rendimiento, debe actualizarse atómicamente con el movimiento y poder reconstruirse desde el ledger.
- Dinero en tipo decimal/entero seguro.
- Índice por `financialAccountId + occurredAt`.
- `sourceType/sourceId` permiten rastrear si el movimiento vino de reserva, visita, egreso, transferencia, etc.

---

## Fuera de alcance

- transferencias entre cuentas (Módulo 06);
- egresos (Módulo 06);
- aportes de propietarios (Módulo 06);
- cierre/conciliación (Módulo 10);
- integración bancaria.

---

## Criterios de aceptación

1. Admin crea `Caja menor` con saldo inicial $200.000.
2. Se genera un movimiento `INITIAL_BALANCE +200.000`.
3. La pantalla muestra saldo $200.000.
4. Admin crea `Caja fuerte` con $2.000.000 y `availableForCustomerPayments=false`.
5. No existe una operación que permita reemplazar arbitrariamente $200.000 por otro valor sin movimiento.
6. Se puede consultar el historial de movimientos por cuenta.
