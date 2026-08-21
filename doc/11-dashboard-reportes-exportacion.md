# Módulo 11 — Dashboard, reportes y exportación

## Objetivo

Dar visibilidad operativa y financiera básica utilizando los datos ya almacenados, sin construir un sistema contable avanzado.

---

## Dashboard MVP

### Hoy

Mostrar como mínimo:

- ventas cobradas de salas/reservas;
- ventas cobradas de cafetería;
- otros ingresos operativos si existen;
- egresos;
- aportes de propietarios **separados de ventas**;
- cuentas/visitas abiertas;
- saldo pendiente de visitas;
- valor comercial de cortesías;
- alertas de stock bajo;
- lotes próximos a vencer/críticos/vencidos.

### Saldos de cuentas financieras

Tarjetas:

- Caja menor;
- Caja fuerte;
- Nequi;
- Daviplata;
- Bancos;
- otras activas.

Mostrar saldo esperado actual.

---

## Reglas de clasificación

No mezclar:

- ventas/ingresos operativos;
- aportes de propietarios;
- transferencias internas;
- egresos.

Una transferencia no incrementa ni ventas ni gastos.

Un aporte puede aumentar efectivo disponible pero no ventas.

---

## Reporte de movimientos financieros

Filtros:

- fecha;
- cuenta financiera;
- tipo;
- categoría;
- origen.

Mostrar:

- fecha/hora;
- descripción;
- entrada/salida;
- cuenta;
- origen;
- usuario.

---

## Reporte de ventas/pedidos

MVP:

- ventas por producto;
- ventas por categoría;
- cantidad vendida;
- valor cobrado;
- cortesías por producto/motivo;
- valor comercial de cortesías.

---

## Reporte de inventario

- stock actual;
- stock bajo;
- movimientos;
- lotes y vencimientos;
- mermas;
- bajas por vencimiento.

---

## Reporte de visitas

Preparar consultas para:

- sala/reserva relacionada;
- valor de sala;
- consumo de cafetería;
- total pagado;
- cantidad de personas si existe;
- fecha/hora.

No construir analítica predictiva en MVP.

---

## Exportación Excel/CSV

Generar bajo demanda desde la base de datos.

No guardar el archivo permanentemente.

Flujo:

`usuario solicita → backend consulta → genera archivo → descarga → archivo temporal puede eliminarse`

Exportaciones iniciales sugeridas:

1. movimientos financieros;
2. ventas/pedidos;
3. inventario/movimientos;
4. cierres diarios.

Columnas de movimientos financieros:

- Fecha
- Hora
- Tipo
- Categoría
- Descripción
- Cuenta financiera
- Valor
- Origen
- Reserva/visita relacionada
- Usuario

---

## Almacenamiento

Conservar datos transaccionales en BD inicialmente de forma indefinida.

No implementar:

- exportación automática diaria a Drive;
- borrado diario;
- archivado por año;
- almacenamiento permanente de Excel.

Si la base de datos se acerca a sus límites en el futuro, diseñar un módulo separado de archivado.

---

## Rendimiento MVP

- filtros por rango de fechas razonable;
- paginación para tablas grandes;
- índices en fecha/cuenta/tipo según consultas;
- evitar queries N+1;
- dashboard con agregaciones simples.

---

## Criterios de aceptación

1. Admin ve saldos actuales de Caja menor, Caja fuerte, Nequi, etc.
2. Ventas y aportes personales aparecen separados.
3. Puede filtrar movimientos de un día y una cuenta.
4. Puede consultar cortesías y vencimientos.
5. Puede exportar un mes a Excel/CSV.
6. El archivo no queda almacenado como documento permanente en la infraestructura.
