# Modulo 21 - Dashboard financiero avanzado

## Objetivo

Mostrar visualmente la evolucion financiera del negocio usando el estado de resultados, rankings y alertas de calidad de datos.

---

## Indicadores principales

Mostrar por periodo:

- ventas salas;
- ventas cafeteria;
- otros ingresos;
- costo de venta cafeteria;
- ganancia bruta;
- egresos operativos;
- utilidad/perdida;
- margen bruto;
- margen operativo;
- cortesias;
- saldos pendientes.

---

## Graficas recomendadas

Usar Recharts, ya instalado en frontend.

Graficas MVP:

1. Linea mensual de utilidad/perdida.
2. Barras de ventas salas vs cafeteria.
3. Barras de egresos por categoria.
4. Ranking de productos por ganancia bruta.
5. Ranking de salas por ventas cobradas.
6. Pie o barras por centro de costo.

Preferir barras sobre tortas cuando hay muchas categorias.

---

## Reglas de negocio

1. El dashboard debe usar las mismas reglas del estado de resultados.
2. No debe mezclar aportes con ventas.
3. No debe mezclar transferencias con ingresos.
4. Debe mostrar advertencias si faltan datos.
5. Los numeros de graficas y tablas deben coincidir.
6. Un periodo cerrado debe poder compararse con periodos anteriores.

---

## Reglas tecnicas

- Crear endpoints agregados especificos para dashboard.
- No cargar miles de filas al frontend para agregarlas ahi.
- Usar cache corto si las consultas se vuelven costosas.
- Agregar indices segun filtros reales.
- Mantener export CSV desde backend.
- Las graficas deben ser responsivas.
- Evitar dependencias pagas.

---

## UI / UX

Pantalla: `Dashboard financiero`.

Debe ser escaneable:

- filtros arriba;
- tarjetas de KPI;
- graficas agrupadas por tema;
- tablas debajo para detalle;
- advertencias visibles pero no invasivas.

Controles:

- periodo: mensual, anual, personalizado;
- area: general, salas, cafeteria;
- comparar con periodo anterior;
- exportar.

No usar textos explicativos largos dentro de la pantalla. Los titulos y etiquetas deben ser suficientes.

---

## Alertas de calidad de datos

Mostrar si existen:

- productos vendidos sin costo;
- recetas incompletas;
- egresos sin centro de costo;
- gastos mixtos sin regla;
- compras sin costo;
- visitas con saldo pendiente;
- cierres diarios faltantes.

---

## Criterios de aceptacion

1. Admin ve utilidad mensual en grafica.
2. Admin compara salas vs cafeteria.
3. Admin ve egresos por categoria.
4. Admin ve productos mas rentables.
5. Admin identifica datos incompletos.
6. Dashboard funciona en desktop y mobile.
7. Graficas coinciden con tabla/export.
