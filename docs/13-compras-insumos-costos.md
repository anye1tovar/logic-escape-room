# Modulo 13 - Compras de insumos y costos

## Objetivo

Registrar compras de insumos con cantidades, costos, lotes y vencimientos para alimentar inventario y costeo.

Este modulo extiende la recepcion de inventario para soportar materias primas, no solo productos finales.

---

## Compra de insumos

Datos generales:

- fecha;
- proveedor;
- descripcion;
- total pagado;
- cuenta de pago;
- financiacion con propietario si aplica;
- usuario.

Items:

- insumo;
- cantidad comprada;
- unidad de compra;
- cantidad convertida a unidad de consumo;
- total linea;
- costo unitario calculado;
- lote;
- vencimiento.

---

## Regla de costo

El costo unitario no debe escribirse manualmente si se tiene:

```text
costo unitario = total linea / cantidad convertida
```

Ejemplo:

```text
Compra: 10 kg de papa
Total linea: $40.000
Unidad consumo: g
Cantidad convertida: 10.000 g
Costo por g: $4
```

---

## Reglas de negocio

1. Una compra confirmada genera movimientos de inventario.
2. Una compra puede tener varios insumos.
3. Un mismo insumo puede aparecer en varias lineas si tiene lotes o vencimientos diferentes.
4. Si el insumo controla vencimiento, el vencimiento debe ser obligatorio.
5. Si el insumo no controla vencimiento, lote/vencimiento deben ser opcionales o estar deshabilitados con tooltip.
6. El total de lineas debe cuadrar con el total pagado si se registra pago.
7. Una compra puede registrarse sin pago inmediato si el proveedor queda pendiente.
8. Si se registra pago desde cuenta financiera, debe crear egreso.
9. Si se paga con dinero del propietario, debe registrarse separado de gastos de caja de Logic.
10. No duplicar compras por doble clic o reintento.

---

## Reglas tecnicas

- Confirmar compra dentro de transaccion.
- Crear `SupplyBatch` cuando el insumo maneje lote o vencimiento.
- Crear `SupplyInventoryMovement` tipo `PURCHASE`.
- Relacionar compra con egreso si existe pago.
- Guardar total linea como fuente de verdad; costo unitario se calcula.
- Usar `requestKey` o idempotencia para evitar duplicados.
- Validar conversion de unidad en backend.
- Evitar `FLOAT` para dinero; usar enteros en COP.
- Para cantidades, usar decimal con escala definida.

---

## UI / UX

Pantalla: `Compras de insumos`.

Debe parecerse a `Compras / recepcion`.

Orden recomendado de columnas:

1. Insumo
2. Cantidad comprada
3. Unidad
4. Total linea
5. Costo unitario calculado
6. Vencimiento
7. Lote
8. Acciones

Mostrar costo unitario como solo lectura.

Si el insumo controla vencimiento:

- habilitar vencimiento/lote;
- mostrar tooltip informativo.

Si no controla vencimiento:

- deshabilitar esos campos;
- tooltip: "Este insumo no controla vencimiento".

---

## Criterios de aceptacion

1. Se registra compra de 10 kg de papa por $40.000.
2. El sistema calcula costo por g.
3. Se registra compra de empaques por unidad.
4. Compra con vencimiento crea lote.
5. Compra pagada desde caja menor crea egreso financiero.
6. Compra financiada por propietario no disminuye caja de Logic.
