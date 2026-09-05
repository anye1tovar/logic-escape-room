# Modulo 18 - Clasificacion de egresos y centros de costo

## Objetivo

Clasificar egresos por area del negocio para poder calcular utilidad operativa estimada.

Areas sugeridas:

- salas;
- cafeteria;
- administracion;
- marketing;
- mixto.

---

## Problema que resuelve

Un egreso como compra de papa pertenece a cafeteria. Pero arriendo, nomina o servicios pueden pertenecer parcialmente a salas y cafeteria.

Sin clasificacion, solo se puede calcular utilidad de caja general, no utilidad por area.

---

## Campos nuevos sugeridos en egresos

- `costCenter`
- `expenseCategory`
- `allocationMode`
- `allocationPercentageRooms`
- `allocationPercentageCafeteria`
- `allocationPercentageAdmin`
- `taxDeductible` opcional futuro

Categorias:

- arriendo;
- servicios publicos;
- nomina;
- insumos;
- mantenimiento;
- marketing;
- comisiones;
- impuestos;
- otros.

---

## Reglas de negocio

1. Todo egreso debe tener categoria.
2. Todo egreso debe tener centro de costo.
3. Si centro de costo es mixto, debe tener regla de reparto.
4. Las compras de insumos/productos deben quedar como cafeteria por defecto.
5. Transferencias internas no son egresos.
6. Aportes de propietarios no son ingresos operativos.
7. Reembolsos a propietarios deben clasificarse separado de egresos operativos.

---

## Reglas tecnicas

- Mantener compatibilidad con egresos ya creados.
- Agregar valores por defecto para registros antiguos: `costCenter=UNASSIGNED`.
- No romper reportes existentes.
- Crear catalogos controlados para categoria y centro de costo.
- Permitir migracion gradual: egresos antiguos se pueden reclasificar.
- Auditar cambios de clasificacion.

---

## UI / UX

En formulario de egresos:

- Categoria;
- Centro de costo;
- si es mixto, mostrar porcentajes;
- descripcion;
- monto;
- cuenta de pago.

No mostrar porcentajes si no se selecciona `Mixto`.

En tabla:

- Fecha;
- Categoria;
- Centro de costo;
- Monto;
- Estado;
- Acciones.

Agregar filtro por categoria y centro de costo.

---

## Criterios de aceptacion

1. Admin registra egreso de arriendo como mixto.
2. Admin registra compra de insumos como cafeteria.
3. Admin registra mantenimiento de sala como salas.
4. Egresos antiguos siguen visibles.
5. Reportes pueden filtrar por centro de costo.
6. Cambiar clasificacion queda auditado.
