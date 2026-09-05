# Modulo 12 - Insumos y materias primas

## Objetivo

Separar los productos vendibles de los insumos que se compran y consumen para producirlos.

Ejemplos:

- producto vendible: Salchipapa;
- insumos: papa, salchicha, queso, salsas, empaque, aceite;
- producto vendible directo: Coca-Cola;
- insumo equivalente: Coca-Cola unidad, si se vende tal como se compra.

Este modulo es la base para calcular costo real, margen y precio sugerido.

---

## Problema que resuelve

Hoy el inventario controla productos de cafeteria como unidades vendibles. Eso sirve para bebidas o productos listos para vender, pero no para preparaciones.

Para saber si una salchipapa deja ganancia, el sistema necesita conocer:

- que ingredientes consume;
- cuanto cuesta cada ingrediente;
- cuanto inventario queda de cada insumo;
- que unidad se compra y que unidad se consume.

---

## Entidades sugeridas

### InventorySupply

Campos minimos:

- `id`
- `name`
- `category`
- `purchaseUnit`
- `consumptionUnit`
- `conversionFactor`
- `trackInventory`
- `trackExpiration`
- `minimumStock`
- `active`
- `createdAt`
- `createdBy`

Ejemplos de unidades:

- compra: kg, libra, litro, paquete, caja, unidad;
- consumo: g, ml, unidad, porcion.

### SupplyCategory

Opcional para MVP, util si se quiere organizar:

- carnes;
- lacteos;
- salsas;
- empaques;
- bebidas;
- congelados;
- limpieza.

---

## Reglas de negocio

1. Un producto vendible no necesariamente es un insumo.
2. Un insumo puede ser vendible directamente si el negocio lo requiere.
3. Todo insumo inventariable debe tener unidad de consumo clara.
4. Si se compra en kg y se consume en g, debe existir factor de conversion.
5. No permitir conversiones ambiguas.
6. Si `trackInventory=false`, el insumo puede usarse para costeo pero no descuenta stock.
7. Si `trackExpiration=true`, las compras deben poder registrar vencimiento/lote.
8. No borrar insumos con movimientos o recetas asociadas; desactivarlos.

---

## Reglas tecnicas

- Usar cantidades decimales para insumos, no solo enteros.
- Guardar cantidades en unidad base de consumo cuando sea posible.
- Evitar cambios silenciosos de stock: usar movimientos.
- Mantener compatibilidad con `cafeteria_products`.
- No romper productos existentes que ya controlan inventario.
- Crear indices por `active`, `category`, `name`.
- Validar conversiones en backend, no solo en UI.

---

## UI / UX

Pantalla: `Insumos`.

Debe permitir:

- crear insumo;
- editar nombre, categoria, unidad y stock minimo;
- activar/desactivar;
- ver stock actual;
- ver si controla vencimiento;
- filtrar por categoria y estado;
- buscar por nombre.

Campos visibles recomendados:

- Nombre;
- Categoria;
- Unidad de compra;
- Unidad de consumo;
- Conversion;
- Inventario;
- Stock minimo;
- Vencimiento;
- Estado.

Evitar formularios largos en una sola fila. Usar panel lateral o modal para editar.

---

## Criterios de aceptacion

1. Admin crea papa comprada por kg y consumida por g.
2. Admin crea empaque consumido por unidad.
3. Admin crea salsa comprada por litro y consumida por ml.
4. No se puede borrar un insumo usado por una receta.
5. La lista muestra stock actual y stock minimo.
6. Un insumo desactivado no aparece para nuevas recetas, pero se conserva historico.
