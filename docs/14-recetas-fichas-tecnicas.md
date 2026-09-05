# Modulo 14 - Recetas y fichas tecnicas

## Objetivo

Definir que insumos consume cada producto vendible para calcular costo directo, margen y precio sugerido.

---

## Concepto

Una receta conecta un producto vendible con sus insumos.

Ejemplo:

```text
Producto: Salchipapa
- papa: 250 g
- salchicha: 1 unidad
- queso: 30 g
- salsa rosada: 20 ml
- empaque: 1 unidad
```

---

## Entidades sugeridas

### ProductRecipe

- `id`
- `productId`
- `version`
- `active`
- `createdAt`
- `createdBy`

### ProductRecipeItem

- `id`
- `recipeId`
- `supplyId`
- `quantity`
- `unit`
- `wastePercent`
- `notes`

---

## Reglas de negocio

1. Un producto puede tener una sola receta activa.
2. Cambios importantes deben crear nueva version, no modificar historico si ya hubo ventas.
3. Una receta puede estar incompleta en borrador, pero no puede activarse incompleta.
4. Una receta activa debe tener al menos un insumo.
5. No permitir cantidades negativas o cero.
6. Si un insumo esta desactivado, no debe poder agregarse a nuevas recetas.
7. El costo de receta se calcula usando costo vigente del insumo.
8. El precio sugerido se calcula con margen objetivo configurable.

---

## Calculos

Costo directo:

```text
costo directo = suma(cantidad de insumo * costo unitario vigente)
```

Margen bruto:

```text
margen bruto = (precio venta - costo directo) / precio venta
```

Precio sugerido:

```text
precio sugerido = costo directo / (1 - margen deseado)
```

Ejemplo:

```text
Costo directo: $8.000
Margen deseado: 60%
Precio sugerido: 8000 / 0.40 = $20.000
```

---

## Reglas tecnicas

- Guardar versiones de receta.
- No recalcular ventas historicas cuando cambia receta.
- Exponer endpoint para preview de costo.
- Usar costo promedio o costo de lote segun estrategia definida.
- Backend debe validar que la receta no tenga insumos repetidos sin razon.
- Mantener los calculos en backend para consistencia.

---

## UI / UX

Pantalla: `Recetas`.

Flujo:

1. Seleccionar producto vendible.
2. Agregar insumos.
3. Definir cantidades.
4. Ver costo calculado.
5. Ver margen con precio actual.
6. Ver precio sugerido.
7. Guardar borrador o activar.

Mostrar tarjetas:

- Precio actual;
- Costo directo;
- Ganancia bruta por unidad;
- Margen actual;
- Precio sugerido.

La tabla de insumos debe mostrar:

- Insumo;
- Cantidad;
- Unidad;
- Costo unitario;
- Costo linea;
- Merma opcional;
- Acciones.

---

## Criterios de aceptacion

1. Admin crea receta de salchipapa.
2. El sistema calcula costo directo.
3. El sistema muestra margen actual.
4. El sistema sugiere precio segun margen objetivo.
5. Cambiar receta crea nueva version si ya tiene ventas.
6. La receta activa se usa para descontar inventario en ventas futuras.
