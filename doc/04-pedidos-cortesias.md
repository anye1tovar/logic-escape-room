# Módulo 04 — Pedidos de cafetería y cortesías

## Objetivo

Permitir que meseros/empleados agreguen rápidamente productos del catálogo existente a una visita desde celular o computador.

---

## Catálogo

Reutilizar los productos y categorías ya existentes en Logic.

No crear un catálogo paralelo.

---

## Flujo móvil

`Cuenta/Visita → Agregar producto → categoría/búsqueda → producto → cantidad`

Priorizar:

- botones grandes;
- pocos pasos;
- búsqueda rápida;
- botones `+` / `-`;
- feedback inmediato.

---

## Modelo sugerido

`OrderItem`

Campos mínimos:

- `id`
- `visitAccountId`
- `productId`
- `productNameSnapshot`
- `unitPriceSnapshot`
- `quantity`
- `commercialSubtotal`
- `chargedSubtotal`
- `type`: `SALE`, `COURTESY`
- `courtesyReason` opcional
- `notes` opcional
- `status`: `ACTIVE`, `CANCELLED`
- `createdAt`
- `createdBy`
- `cancelledAt` opcional
- `cancelledBy` opcional

---

## Reglas de venta normal

1. Guardar snapshot de nombre y precio al agregar.
2. Cambiar el precio futuro del producto no altera ventas históricas.
3. Mientras no exista pago asignado al item, puede modificarse/cancelarse según permisos.
4. Si ya tiene pago asignado, no eliminar directamente; la corrección debe hacerse por flujo de anulación/ajuste del pago.
5. Cancelar un item deja trazabilidad; no hard delete.

---

## Cortesías

Al agregar un producto permitir `Marcar como cortesía`.

Una cortesía:

- conserva precio comercial como referencia;
- cobra $0;
- no aumenta saldo pendiente;
- no genera ingreso financiero;
- se identifica visualmente como `CORTESÍA`;
- registra usuario, fecha y motivo;
- cuando exista inventario (Módulo 07), descuenta stock normalmente.

Motivos MVP sugeridos:

- `PROMOTION`
- `BIRTHDAY`
- `COMPENSATION`
- `LOYALTY`
- `EVENT`
- `OTHER`

`OTHER` requiere observación.

No modelar cortesía como un pago de $0.

Registrar una cortesía requiere permiso explícito (`canCreateCourtesy` o equivalente). Si un empleado no lo tiene, la UI no ofrece la acción y el backend debe rechazarla igualmente.

---

## Consumo interno

No implementarlo completamente en este módulo.

Dejar el enum/modelo extensible para un futuro `INTERNAL_CONSUMPTION`, pero el MVP puede limitar la UI a `SALE` y `COURTESY`.

---

## Totales de visita

El total cobrado de cafetería debe sumar `chargedSubtotal`.

El valor comercial de cortesías debe poder consultarse por separado.

Ejemplo:

- Coca-Cola $4.000 venta → cobrado $4.000
- Coca-Cola $4.000 cortesía → cobrado $0, valor comercial cortesía $4.000

---

## Actualización

Después de agregar/modificar producto:

- actualizar cache del usuario actual;
- otros usuarios ven el cambio al pulsar `Actualizar`/refocus.

Sin polling.

---

## Reglas técnicas

- Backend recalcula importes; no confiar en subtotal enviado por frontend.
- Si quantity cambia, snapshot de precio permanece.
- Acciones concurrentes deben ser operaciones específicas, no reemplazo de toda la lista.
- Registrar auditoría crítica de creación/cancelación/cortesía.

---

## Fuera de alcance

- descuento real de inventario hasta Módulo 07;
- recetas;
- comandas de cocina impresas;
- estados de preparación complejos.

---

## Criterios de aceptación

1. Mesero abre `Andrea · Mesa 2` desde celular.
2. Agrega 2 Coca-Cola y 1 Nuggets.
3. Marca una Coca-Cola como cortesía por cumpleaños.
4. La visita cobra solo una Coca-Cola + Nuggets.
5. Se conserva el valor comercial de la cortesía.
6. Caja puede ver el cambio después de `Actualizar`.
