# Modulo 15 - Descuento de inventario por receta

## Objetivo

Cuando se venda un producto preparado, descontar los insumos definidos en su receta en lugar de descontar solo una unidad del producto.

---

## Comportamiento esperado

Venta:

```text
1 Salchipapa
```

Debe descontar:

```text
- 250 g papa
- 1 salchicha
- 30 g queso
- 20 ml salsa
- 1 empaque
```

Para productos directos como Coca-Cola:

```text
Venta: 1 Coca-Cola
Descuento: 1 Coca-Cola unidad
```

---

## Reglas de negocio

1. Si producto tiene receta activa, se descuentan insumos.
2. Si producto no tiene receta y controla inventario, se descuenta el producto como unidad.
3. Si producto no controla inventario, no genera descuento.
4. No permitir venta si no hay stock suficiente, salvo permiso explicito.
5. Si se cancela el item antes de cierre definitivo, revertir todos los movimientos.
6. Cortesias tambien descuentan inventario.
7. El pago no debe descontar inventario; el descuento ocurre al crear/confirmar pedido.
8. Si se edita cantidad del pedido, ajustar diferencia de insumos.

---

## Estrategia de lotes

Para insumos con vencimiento, consumir por FEFO:

```text
First Expired, First Out
```

Es decir, primero se consume el lote que vence antes.

---

## Movimientos sugeridos

Tipos:

- `RECIPE_SALE`
- `RECIPE_COURTESY`
- `RECIPE_REVERSAL`
- `DIRECT_SALE`
- `DIRECT_COURTESY`
- `DIRECT_REVERSAL`

Campos:

- `supplyId` o `productId`;
- `batchId`;
- `quantityDelta`;
- `sourceType = ORDER_ITEM`;
- `sourceId`;
- `recipeId`;
- `reason`;
- `createdBy`;
- `createdAt`.

---

## Reglas tecnicas

- Crear pedido y movimientos en una sola transaccion.
- Bloquear lotes seleccionados durante descuento para evitar carrera de stock.
- No usar stock cacheado como unica fuente para validar disponibilidad.
- Guardar relacion entre `order_item` y movimientos generados.
- Reversion debe encontrar exactamente los movimientos originales.
- Evitar N+1 cargando receta e insumos en bloque.

---

## UI / UX

En la pantalla de cuenta/visita:

- al agregar producto preparado, mostrar si hay stock suficiente;
- si falta un insumo, bloquear y explicar cual falta;
- para admin, permitir ver detalle de receta consumida en el item.

Mensaje recomendado:

```text
No hay suficiente papa para vender 2 Salchipapas.
Disponible: 300 g. Requerido: 500 g.
```

---

## Criterios de aceptacion

1. Vender 1 salchipapa descuenta todos sus insumos.
2. Vender 2 salchipapas descuenta el doble.
3. Cortesia descuenta inventario.
4. Cancelar item revierte insumos.
5. Si falta un insumo, la venta se bloquea.
6. Para lotes con vencimiento, consume primero el lote que vence antes.
