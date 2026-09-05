# Modulo 19 - Reglas de reparto de gastos indirectos

## Objetivo

Distribuir gastos indirectos entre areas del negocio para estimar utilidad por salas, cafeteria y operacion general.

---

## Gastos indirectos

Ejemplos:

- arriendo;
- energia;
- agua;
- internet;
- nomina administrativa;
- aseo;
- mantenimiento general.

Estos gastos no pertenecen naturalmente a una venta especifica.

---

## Modos de reparto

### Porcentaje fijo

Ejemplo:

```text
Arriendo:
70% salas
30% cafeteria
```

### Manual por egreso

El usuario define porcentajes al registrar el egreso.

### Por ventas del periodo

El sistema reparte segun proporcion de ventas.

Ejemplo:

```text
Ventas salas: 80%
Ventas cafeteria: 20%
Gasto mixto: se reparte 80/20
```

MVP recomendado: porcentaje fijo y manual por egreso.

---

## Entidades sugeridas

### CostAllocationRule

- `id`
- `name`
- `expenseCategory`
- `effectiveFrom`
- `effectiveTo`
- `roomsPercent`
- `cafeteriaPercent`
- `adminPercent`
- `active`
- `createdAt`
- `createdBy`

---

## Reglas de negocio

1. La suma de porcentajes debe ser 100%.
2. Las reglas deben tener vigencia.
3. Cambiar una regla no debe modificar reportes cerrados si ya fueron congelados.
4. Si no hay regla para un gasto mixto, marcar como pendiente de clasificacion.
5. Permitir override manual por egreso.
6. No repartir transferencias internas.
7. No repartir aportes de propietarios.

---

## Reglas tecnicas

- Guardar la regla aplicada en el reporte o snapshot.
- Validar porcentajes en backend.
- Usar enteros o decimales controlados para porcentajes.
- Evitar recalculo historico accidental.
- Crear endpoint para simular reparto antes de guardar.
- Auditar cambios de reglas.

---

## UI / UX

Pantalla: `Reglas de reparto`.

Debe permitir:

- crear regla por categoria;
- definir porcentajes;
- activar/desactivar;
- ver vigencia;
- probar impacto con periodo de ejemplo.

Usar sliders o inputs numericos con suma visible.

Mostrar alerta si:

- suma no da 100%;
- hay categorias mixtas sin regla;
- una regla nueva solapa vigencia con otra activa.

---

## Criterios de aceptacion

1. Admin crea regla 70% salas / 30% cafeteria para arriendo.
2. Sistema bloquea suma diferente de 100%.
3. Egreso mixto usa regla vigente.
4. Admin puede hacer override manual.
5. Reporte muestra cuanto gasto fue asignado a cada area.
6. Cambios de reglas quedan auditados.
