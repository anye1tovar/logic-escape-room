# Logic Escape Room — Sistema operativo de cafetería y finanzas (MVP)

## 1. Propósito

Ampliar el sistema web existente de Logic Escape Room para resolver de forma incremental:

1. cuentas financieras de Logic;
2. abonos de reservas;
3. cuentas/visitas de clientes;
4. pedidos de cafetería y cortesías;
5. pagos divididos y caja;
6. egresos, aportes de propietarios y transferencias;
7. inventario;
8. lotes y vencimientos;
9. compras y recepción de mercancía;
10. cierre diario y conciliación;
11. dashboard, reportes y exportaciones.

El sistema existente ya administra **reservas** y **productos de cafetería**. Estos modelos deben reutilizarse; no crear duplicados sin una razón técnica fuerte.

---

## 2. Principios del MVP

### 2.1 Implementación incremental

Cada módulo se implementa, prueba y estabiliza antes de comenzar el siguiente. No adelantar funcionalidades de módulos futuros salvo estructuras mínimas necesarias para no bloquear el diseño.

### 2.2 Costo de infraestructura

Logic utiliza servicios con capacidad gratuita o limitada. El MVP debe priorizar bajo consumo:

- sin WebSockets;
- sin Server-Sent Events;
- sin polling periódico continuo;
- sin Redis;
- sin colas o cron jobs salvo que el repositorio ya los use y sean imprescindibles;
- sin almacenar reportes Excel generados;
- sin guardar archivos pesados en la base de datos.

### 2.3 Sin tiempo real en el MVP

Las pantallas de cuentas/pedidos deben actualizarse de esta forma:

- consulta al entrar a la pantalla;
- botón visible `Actualizar`;
- invalidación/refetch después de mutaciones hechas por el mismo usuario;
- opcional: refetch al recuperar foco de la pestaña/ventana.

Otros usuarios no tienen que ver una modificación instantáneamente. Si un mesero avisa que ya registró un pedido, caja puede pulsar `Actualizar`.

### 2.4 Base de datos como fuente de verdad

Guardar en base de datos:

- cuentas financieras;
- movimientos financieros;
- pagos de reservas;
- cuentas/visitas;
- pedidos;
- pagos;
- cortesías;
- inventario y movimientos;
- lotes;
- compras;
- cierres diarios;
- auditoría crítica.

No eliminar los registros al terminar el día.

### 2.5 Excel es una exportación, no almacenamiento

Los Excel/CSV se generan **bajo demanda**, se descargan y no se guardan permanentemente en el servidor. Si el usuario necesita el mismo mes nuevamente, se vuelve a generar desde la base de datos.

### 2.6 Datos históricos pequeños

El dominio es principalmente transaccional y textual. No implementar archivado histórico en el MVP. Si en el futuro la base de datos se acerca a su límite, diseñar entonces una estrategia de archivado de datos antiguos; no optimizar anticipadamente.

---

## 3. Dos conceptos de “cuenta”

Evitar confusión entre:

### `VisitAccount`
Cuenta/visita de un cliente o grupo. Agrupa reserva, sala, pedidos de cafetería y pagos.

### `FinancialAccount`
Lugar donde Logic tiene dinero: Caja menor, Caja fuerte, Nequi, Daviplata, Bancolombia, etc.

En código utilizar nombres inequívocos.

---

## 4. Reglas financieras transversales

1. Un pedido no genera dinero recibido.
2. Un pago confirmado sí genera un movimiento financiero.
3. Un aporte de propietario no es una venta ni ingreso operativo.
4. Una transferencia entre cuentas financieras no es ingreso ni egreso del negocio.
5. Un gasto pagado directamente con dinero personal del propietario no debe fingirse como salida de una cuenta de Logic.
6. Después de inicializar una cuenta financiera, el saldo no se edita directamente: cambia mediante movimientos.
7. Los movimientos financieros importantes no se eliminan físicamente; se anulan o compensan con trazabilidad.

---

## 5. Roles y permisos mínimos

Reutilizar el sistema de usuarios/roles existente si ya existe. No crear RBAC complejo solo para este MVP. Como referencia funcional:

### Empleado / mesero

- ver cuentas/visitas abiertas;
- crear cuenta manual;
- abrir cuenta desde reserva si el negocio lo permite;
- agregar/modificar/cancelar items aún no pagados;
- registrar cortesías solo si posee permiso explícito, por ejemplo `canCreateCourtesy`.

### Caja

- todo lo operativo necesario para pedidos;
- registrar pagos;
- consultar movimientos del día;
- realizar cierre normal cuando no existan diferencias que requieran autorización.

### Administrador

- configurar cuentas financieras y saldos iniciales;
- anular pagos;
- egresos, aportes, transferencias y ajustes;
- inventario, compras y bajas;
- cerrar con diferencia/ajustar caja;
- reportes y configuración.

Los permisos críticos deben validarse también en backend.

---

## 6. Reglas de auditoría transversales

Guardar auditoría solamente para acciones relevantes, por ejemplo:

- creación/cancelación de cuenta/visita;
- agregar/cancelar productos;
- registrar cortesía;
- registrar/anular pago;
- registrar egreso;
- aporte de propietario;
- transferencia;
- ajuste de inventario;
- baja por vencimiento;
- cierre diario;
- ajuste por diferencia de caja.

No auditar visualizaciones, búsquedas, navegación o cambios de pestaña.

Guardar solo metadata pequeña y útil; no snapshots completos gigantes.

---

## 7. Reglas técnicas transversales

- Analizar primero la arquitectura existente y seguir sus convenciones.
- Reutilizar autenticación, autorización, componentes, manejo de estado y acceso a datos existentes.
- No crear una aplicación independiente.
- Backend debe validar todas las reglas de negocio críticas; frontend no es fuente de autoridad.
- Usar transacciones de base de datos cuando una operación genere varios registros que deban ser atómicos.
- Evitar sobrescribir entidades completas desde frontend cuando dos usuarios puedan actuar sobre ellas.
- Preferir operaciones específicas: `addItem`, `registerPayment`, `cancelItem`, `transferFunds`, etc.
- Conservar snapshots de nombre/precio en transacciones históricas cuando un cambio futuro del catálogo no deba alterar el pasado.
- Fechas monetarias y cantidades deben tratarse con precisión; no usar punto flotante para dinero si el stack ofrece un tipo decimal/entero seguro.

---

## 8. Orden de implementación

| Orden | Archivo | Módulo |
|---:|---|---|
| 1 | `01-cuentas-financieras-ledger.md` | Cuentas financieras y ledger base |
| 2 | `02-reservas-abonos.md` | Abonos flexibles de reservas |
| 3 | `03-cuentas-visitas.md` | Cuentas/visitas de clientes |
| 4 | `04-pedidos-cortesias.md` | Pedidos de cafetería y cortesías |
| 5 | `05-pagos-caja.md` | Cobros, pagos parciales y asignaciones |
| 6 | `06-egresos-aportes-transferencias.md` | Egresos, aportes y transferencias |
| 7 | `07-inventario-base.md` | Inventario y movimientos básicos |
| 8 | `08-lotes-vencimientos.md` | Lotes, FEFO y vencimientos |
| 9 | `09-compras-recepcion.md` | Compras y recepción de inventario |
| 10 | `10-cierre-diario-conciliacion.md` | Cierre diario y conciliación |
| 11 | `11-dashboard-reportes-exportacion.md` | Dashboard, reportes y Excel |

---

## 9. Fuera del MVP completo

No implementar todavía:

- facturación electrónica;
- contabilidad formal;
- integración bancaria automática;
- notificaciones push/SMS/WhatsApp de vencimientos;
- PWA offline completa;
- WebSockets/tiempo real;
- proveedores avanzados;
- órdenes de compra complejas;
- recetas completas de cocina si retrasan el MVP;
- costos/márgenes contables avanzados;
- nómina;
- multi-sede;
- conciliación bancaria automática;
- almacenamiento histórico en Drive/object storage;
- dashboard con analítica pesada.

---

## 10. Criterio global de éxito

El MVP está terminado cuando Logic puede operar un día completo sin papelitos para pedidos, registrar abonos y pagos correctamente, conocer en qué cuenta financiera quedó el dinero, controlar inventario con lotes/vencimientos, registrar gastos/aportes, cuadrar la caja al final del día y consultar/exportar el histórico desde la base de datos.
