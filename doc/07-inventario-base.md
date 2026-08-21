# Módulo 07 — Inventario base

## Objetivo

Controlar existencias de productos simples y registrar toda entrada/salida mediante movimientos trazables.

---

## Configuración de producto

Extender producto existente con campos similares a:

- `trackInventory`
- `minimumStock` opcional
- unidad de medida simple si el modelo actual la necesita.

Ejemplos:

- Coca-Cola: controla inventario;
- Agua: controla inventario;
- Servilletas: opcional;
- Sala Caníbal: no controla inventario.

---

## Movimientos de inventario

Tipos MVP:

- `INITIAL_STOCK`
- `PURCHASE`
- `SALE`
- `COURTESY`
- `WASTE`
- `ADJUSTMENT_POSITIVE`
- `ADJUSTMENT_NEGATIVE`
- `REVERSAL`

Campos mínimos:

- `id`
- `productId`
- `type`
- `quantityDelta`
- `occurredAt`
- `sourceType`
- `sourceId` opcional
- `reason` opcional
- `createdBy`

---

## Regla central

No cambiar stock silenciosamente.

Todo cambio debe tener un movimiento.

El stock actual puede calcularse o mantenerse cacheado, pero debe ser reconciliable con los movimientos.

---

## Momento de descuento por pedido

Para el MVP, cuando un `OrderItem` de producto inventariable queda activo/confirmado en la visita, se considera reservado/salido operacionalmente y genera movimiento:

- venta normal → `SALE`;
- cortesía → `COURTESY`.

Si el item se cancela antes del pago/entrega definitiva, generar `REVERSAL` correspondiente.

No volver a descontar inventario al pagar.

---

## Stock mínimo

Si `currentStock <= minimumStock`, mostrar `Stock bajo`.

No enviar notificaciones externas.

---

## Ajuste físico

Admin puede introducir conteo real.

Ejemplo:

Sistema: 23
Real: 21

Generar `ADJUSTMENT_NEGATIVE -2` con motivo.

Nunca reemplazar 23 por 21 sin movimiento.

---

## Mermas

Registrar producto roto, perdido, dañado, etc. como `WASTE` con motivo.

Vencidos se implementan específicamente en Módulo 08.

---

## Reglas técnicas

- Cantidades pueden requerir decimal si luego se manejan gramos/kg; revisar stack antes de fijar entero.
- Evitar stock negativo salvo configuración explícita; para MVP bloquear venta si no hay stock disponible cuando `trackInventory=true`.
- Integrar creación/cancelación de OrderItem + movimientos de inventario de forma atómica cuando sea posible.

---

## Fuera de alcance

- lotes/vencimientos (Módulo 08);
- recetas de ingredientes;
- reservas de stock complejas;
- multi-almacén.

---

## Criterios de aceptación

1. Coca-Cola inicia con 24 unidades mediante `INITIAL_STOCK`.
2. Agregar 2 Coca-Cola a una visita genera `SALE -2`.
3. Una Coca-Cola de cortesía genera `COURTESY -1`.
4. Pagar no vuelve a descontar.
5. Cancelar un item válido revierte su salida.
6. Conteo físico menor genera ajuste trazable.
