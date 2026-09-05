# Modulo 20 - Estado de resultados

## Objetivo

Construir un reporte de ganancias y perdidas por periodo, usando ventas, costos directos, egresos y reglas de reparto.

---

## Alcance del reporte

Filtros:

- dia;
- mes;
- ano;
- rango personalizado;
- area: general, salas, cafeteria.

---

## Estructura sugerida

```text
Ventas salas
+ Ventas cafeteria
+ Otros ingresos operativos
= Ingresos operativos

- Costo de venta cafeteria
= Ganancia bruta

- Egresos operativos asignados
= Utilidad operativa estimada

+/- Ajustes
= Resultado estimado del periodo
```

Separados, no mezclados:

- aportes de propietarios;
- transferencias internas;
- reembolsos a propietarios;
- cortesias;
- saldos pendientes.

---

## Reglas de negocio

1. Ventas deben contar segun pagos cobrados o devengo, segun filtro.
2. MVP recomendado: base caja, es decir, lo cobrado.
3. Transferencias internas no afectan resultado.
4. Aportes de propietarios no son ventas.
5. Egresos financiados por propietario pueden ser gasto operativo aunque no salgan de caja de Logic.
6. Cortesias no son venta cobrada, pero muestran impacto comercial y costo.
7. Saldos pendientes se muestran aparte.
8. Resultado estimado debe indicar si hay costos incompletos.

---

## Base caja vs base devengo

### Base caja

Cuenta cuando se cobra o paga.

Sirve para:

- flujo real de dinero;
- control diario;
- cierre de caja.

### Base devengo

Cuenta cuando se vende o incurre el gasto, aunque no se haya cobrado/pagado.

Sirve para:

- rentabilidad economica;
- analisis contable.

MVP: base caja con opcion futura de devengo.

---

## Reglas tecnicas

- Usar agregaciones SQL por periodo.
- Evitar recalcular snapshots cerrados.
- Permitir export CSV.
- Preparar API para graficas mensuales/anuales.
- Marcar reportes con advertencias:
  - costos incompletos;
  - egresos sin centro de costo;
  - gastos mixtos sin regla;
  - visitas con saldo pendiente.
- No mezclar este reporte con conciliacion bancaria.

---

## UI / UX

Pantalla: `Estado de resultados`.

Secciones:

1. Filtros de periodo.
2. Tarjetas resumen.
3. Tabla estilo estado de resultados.
4. Grafica de ingresos vs gastos.
5. Desglose por area.
6. Advertencias de calidad de datos.
7. Exportar CSV.

Tarjetas:

- Ingresos operativos;
- Costo de venta;
- Ganancia bruta;
- Egresos;
- Utilidad/perdida;
- Margen.

Usar semaforo:

- verde: utilidad positiva;
- rojo: perdida;
- amarillo: datos incompletos.

---

## Criterios de aceptacion

1. Admin calcula resultado de un mes.
2. Admin calcula resultado anual.
3. Admin calcula rango personalizado.
4. Ventas de salas y cafeteria aparecen separadas.
5. Aportes y transferencias aparecen separados del resultado.
6. Reporte advierte si faltan costos o clasificaciones.
7. CSV exporta el estado de resultados.
