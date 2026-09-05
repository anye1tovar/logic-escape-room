# Modulo 17 - Reporte de ganancia bruta de cafeteria

## Objetivo

Calcular ventas, costo de venta, ganancia bruta y margen de cafeteria por producto, categoria y periodo.

---

## Reporte principal

Filtros:

- rango personalizado;
- mes;
- ano;
- producto;
- categoria;
- tipo: venta, cortesia, todos.

Metricas:

- unidades vendidas;
- ventas cobradas;
- valor comercial;
- costo de venta;
- ganancia bruta;
- margen bruto;
- cortesias;
- costo de cortesias.

---

## Formulas

Ganancia bruta:

```text
ganancia bruta = ventas cobradas - costo de venta
```

Margen bruto:

```text
margen bruto = ganancia bruta / ventas cobradas
```

Para cortesias:

```text
ingreso = 0
costo = costo del producto
impacto = -costo
valor comercial no cobrado = precio normal
```

---

## Reglas de negocio

1. Usar costos historicos de venta.
2. No mezclar ventas de salas en este reporte.
3. Cortesias deben aparecer separadas de ventas cobradas.
4. Productos con costo incompleto deben mostrarse con alerta.
5. Productos anulados no deben contar como ventas activas.
6. Permitir ranking de productos mas rentables y menos rentables.

---

## Reglas tecnicas

- Consultar `order_items` + snapshots de costo.
- Agregar por producto/categoria sin N+1.
- Paginacion para detalle.
- Export CSV.
- Graficas con Recharts:
  - barras por ganancia bruta;
  - barras por unidades vendidas;
  - torta o barras por categoria si aplica.
- Evitar recalcular costos desde recetas actuales.

---

## UI / UX

Pantalla: `Ganancia cafeteria`.

Secciones:

1. Resumen del periodo.
2. Grafica de ventas vs costo.
3. Ranking de productos por ganancia.
4. Tabla detallada.
5. Exportar CSV.

Tarjetas:

- Ventas cafeteria;
- Costo de venta;
- Ganancia bruta;
- Margen bruto;
- Costo de cortesias;
- Productos con costo incompleto.

Usar colores con cuidado:

- verde para ganancia positiva;
- rojo/advertencia para perdida o costo incompleto;
- amarillo para cortesias.

---

## Criterios de aceptacion

1. Admin ve ganancia bruta de cafeteria por mes.
2. Admin ve producto mas rentable.
3. Admin ve producto menos rentable.
4. Cortesias aparecen separadas.
5. Productos con costo incompleto se identifican.
6. CSV exporta los mismos datos del reporte.
