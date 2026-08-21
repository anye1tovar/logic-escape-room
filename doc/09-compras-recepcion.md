# Módulo 09 — Compras y recepción de inventario

## Objetivo

Registrar de forma rápida la llegada de productos de Coca-Cola, mercado, supermercado, etc., creando stock/lotes y opcionalmente el gasto financiero relacionado.

---

## Compra / recepción

Crear una pantalla `Registrar compra / ingreso de inventario`.

Datos generales:

- fecha;
- proveedor opcional/texto libre;
- descripción/nota;
- total pagado opcional;
- fuente(s) de pago opcional;
- usuario.

Items:

- producto;
- cantidad;
- costo unitario o total opcional;
- fecha de vencimiento si el producto la controla;
- número de lote opcional.

---

## Múltiples vencimientos del mismo producto

Permitir varias líneas/lotes del mismo producto.

Ejemplo:

Empanadas:

- 3 paquetes → 28/08/2026
- 2 paquetes → 15/09/2026

No crear productos diferentes; crear lotes diferentes.

---

## Efecto en inventario

Confirmar recepción genera:

- `InventoryBatch` cuando aplique;
- `InventoryMovement PURCHASE` por cantidades recibidas.

Si producto no controla vencimiento, basta movimiento de entrada según modelo de inventario.

---

## Efecto financiero opcional

Si se registra cómo se pagó la compra:

- desde `FinancialAccount` → crear gasto/movimiento financiero;
- con dinero personal del propietario → registrar financiación `OWNER_PERSONAL_FUNDS` sin disminuir cuenta de Logic;
- combinación de fuentes permitida reutilizando Módulo 06.

Inventario y gasto son conceptos relacionados pero separados.

Una recepción puede registrarse incluso si el pago se registrará después, si el flujo del negocio lo requiere.

---

## Reglas de negocio

1. Confirmar una compra no debe crear stock duplicado por reintento/doble clic.
2. Si una compra se corrige, usar ajuste/cancelación trazable; no borrar silenciosamente movimientos que ya afectaron stock.
3. Vencimiento obligatorio solo si `trackExpiration=true` y la política del producto lo exige.
4. No exigir proveedor formal en MVP.
5. Costos son recomendados porque luego ayudan a inventario en riesgo, pero no bloquear si algunos productos no tienen costo exacto.

---

## UI mínima

Formulario tipo tabla/lista con:

- Producto
- Cantidad
- Vencimiento
- Costo opcional
- `+ Agregar otro lote`

Botón `Confirmar recepción`.

---

## Reglas técnicas

- Confirmación debe agrupar creación de compra, lotes y movimientos en transacción.
- Si también genera egreso, integrar atómicamente o definir compensación segura.
- Evitar almacenar fotos de facturas/recibos en MVP para ahorrar almacenamiento.

---

## Criterios de aceptación

1. Se registran 24 Coca-Cola con vencimiento A y 12 con vencimiento B.
2. Se crean dos lotes y stock total +36.
3. Se registra compra pagada desde Nequi; Nequi disminuye correctamente y se registra gasto.
4. Se puede registrar otra compra pagada parcialmente con dinero personal sin inventar una cuenta de Logic.
