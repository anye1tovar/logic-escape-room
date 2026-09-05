# Modulo 16 - Costo historico de venta

## Objetivo

Guardar el costo real o estimado de cada venta en el momento en que ocurre para que los reportes historicos no cambien si luego cambian precios, compras o recetas.

---

## Problema que resuelve

Si hoy una salchipapa cuesta $8.000 producirla y manana cuesta $9.500, las ventas de hoy deben conservar costo $8.000.

No se debe recalcular historico usando costos actuales.

---

## Entidades sugeridas

### OrderItemCostSnapshot

- `id`
- `orderItemId`
- `productId`
- `recipeId`
- `quantity`
- `unitRevenue`
- `totalRevenue`
- `unitCost`
- `totalCost`
- `grossProfit`
- `grossMargin`
- `costingMethod`
- `createdAt`

### OrderItemCostComponent

- `id`
- `snapshotId`
- `supplyId`
- `batchId`
- `quantity`
- `unitCost`
- `totalCost`

---

## Metodos de costeo

MVP recomendado:

- costo promedio para insumos sin vencimiento;
- costo por lote FEFO para insumos con vencimiento;
- snapshot al momento de venta.

Opciones futuras:

- FIFO;
- costo promedio ponderado;
- costo manual.

---

## Reglas de negocio

1. Toda venta de cafeteria debe tener snapshot de costo.
2. Si no hay costo disponible, permitir venta pero marcar `costIncomplete=true`.
3. Las cortesias deben guardar costo, aunque no tengan ingreso.
4. Las anulaciones no borran snapshot; generan estado anulado.
5. Si cambia la receta, los snapshots anteriores no cambian.
6. Si cambia el precio de producto, ventas anteriores no cambian.

---

## Reglas tecnicas

- Crear snapshot en la misma transaccion del pedido.
- Guardar componentes por insumo para auditoria.
- Usar enteros para dinero.
- Para cantidades decimales, usar numeric con escala.
- Reportes deben leer snapshots, no recalcular desde recetas actuales.
- Agregar indices por `orderItemId`, `productId`, `createdAt`.

---

## UI / UX

En detalle de pedido:

- mostrar precio cobrado;
- costo registrado;
- ganancia bruta;
- margen.

Si costo incompleto:

- mostrar chip `Costo incompleto`;
- permitir que admin identifique que insumo no tenia costo.

No mostrar demasiada contabilidad en la pantalla de cobro; dejar detalle para reportes o modal tecnico.

---

## Criterios de aceptacion

1. Venta de salchipapa guarda costo total.
2. Venta de Coca-Cola guarda costo segun lote/compra.
3. Cambiar receta no altera venta anterior.
4. Cambiar costo de compra no altera venta anterior.
5. Cortesia guarda costo y margen negativo o ingreso cero.
6. Reporte de ganancia bruta usa snapshots.
