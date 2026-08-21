# Módulo 08 — Lotes, FEFO y vencimientos

## Objetivo

Controlar fechas de vencimiento por lote, alertar productos próximos a vencer, impedir venta de vencidos y consumir primero lo que vence primero.

---

## Por qué por lote y no por unidad

No registrar 24 Coca-Colas individualmente si comparten vencimiento.

Ejemplo:

- Lote A: 18 Coca-Cola, vence 15/11/2026
- Lote B: 6 Coca-Cola, vence 20/12/2026

Si un mismo pedido trae vencimientos diferentes, crear lotes distintos.

---

## Configuración del producto

Agregar:

- `trackExpiration`
- `expirationAlertDays` (default sugerido 30)
- `criticalExpirationAlertDays` (default sugerido 7)

No todos los productos necesitan vencimiento.

---

## `InventoryBatch`

Campos sugeridos:

- `id`
- `productId`
- `receivedQuantity`
- `currentQuantity`
- `receivedAt`
- `expirationDate`
- `lotNumber` opcional
- `purchaseId` opcional
- `createdBy`
- `createdAt`

No es obligatorio persistir `EXPIRING_SOON`; puede calcularse según fecha actual.

---

## FEFO

Usar **First Expired, First Out**.

Cuando una venta/cortesía consume stock, asignar automáticamente primero al lote disponible con vencimiento más cercano.

Ejemplo:

- Lote A: 8 unidades, vence septiembre
- Lote B: 24 unidades, vence diciembre

Venta 1 unidad → Lote A queda en 7.

---

## Stock disponible vs físico

Distinguir:

- `physicalStock`: todo lo que físicamente aún está registrado;
- `sellableStock`: solo unidades no vencidas y disponibles.

Un producto puede tener stock físico > 0 y stock vendible = 0 si todo está vencido.

---

## Vencidos

1. Un lote vencido no puede usarse para venta/cortesía.
2. Debe aparecer como pendiente de baja.
3. Admin ejecuta `Dar de baja vencidos`.
4. Generar movimiento de inventario `EXPIRED`/`WASTE_EXPIRED` por la cantidad retirada.
5. No borrar lote ni stock silenciosamente.

Agregar el tipo de movimiento correspondiente al módulo 07.

---

## Alertas

Calcular al consultar inventario/dashboard, sin cron obligatorio.

Estados visuales sugeridos:

- Normal
- Próximo a vencer
- Crítico
- Vencido

Ejemplo:

- aviso 30 días;
- crítico 7 días.

Valores configurables por producto.

No implementar notificaciones push/email/WhatsApp en MVP.

---

## Inventario en riesgo

Si existe costo de compra disponible, preparar consulta opcional:

- cantidad próxima a vencer;
- costo estimado;
- valor comercial potencial.

No bloquear el módulo si aún no hay costos confiables.

---

## Reglas técnicas

- Consultas de FEFO ordenadas por `expirationDate ASC` y solo lotes con cantidad > 0 y no vencidos.
- Consumo que atraviesa varios lotes debe generar asignaciones/movimientos por lote.
- La fecha de vencimiento debe evaluarse en zona horaria definida por el negocio.
- No usar background job solo para cambiar estados; derivarlos en lectura cuando sea posible.

---

## Criterios de aceptación

1. Producto tiene dos lotes con vencimientos distintos.
2. Venta consume primero el lote que vence antes.
3. Cortesía también usa FEFO.
4. Lote vencido queda bloqueado para venta.
5. Dashboard/inventario muestra alerta 30/7 días según configuración.
6. Dar de baja vencidos crea movimiento trazable.
