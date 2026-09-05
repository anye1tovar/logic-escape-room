# Plan de regresion manual completa

## 1. Objetivo

Este documento permite probar manualmente, en orden, los modulos financieros,
operativos, de inventario, costos y reportes implementados entre los modulos 01
y 21.

La regresion no debe limitarse a comprobar que un boton funciona. Debe verificar
que una accion tenga el mismo efecto en todas las areas relacionadas. Por
ejemplo, cobrar un producto debe actualizar la cuenta de la visita, la cuenta
financiera, los reportes de ventas y el estado de resultados, pero no debe volver
a descontar inventario.

## 2. Como usar este documento

1. Ejecutar primero la preparacion y el recorrido critico.
2. Ejecutar despues los casos por modulo, en el orden indicado.
3. Marcar cada caso como `OK`, `FALLO`, `BLOQUEADO` o `NO APLICA`.
4. Registrar evidencia antes de corregir un fallo.
5. Despues de una correccion, repetir el caso fallido, su caso inverso y los
   casos relacionados indicados en la columna `Regresion relacionada`.
6. No cerrar el dia de pruebas hasta terminar los casos que necesitan modificar
   movimientos del mismo dia.

Un resultado visual correcto no reemplaza la comprobacion numerica. Para saldos,
stock y reportes, anotar siempre el valor anterior, el movimiento realizado y el
valor posterior.

## 3. Estados y severidad de defectos

| Campo | Valores |
| --- | --- |
| Resultado | `OK`, `FALLO`, `BLOQUEADO`, `NO APLICA` |
| Severidad | `S1` perdida/corrupcion de dinero o inventario; `S2` flujo principal bloqueado; `S3` calculo/UI incorrecto con alternativa; `S4` detalle visual o texto |
| Evidencia minima | captura, URL/pantalla, usuario, fecha/hora, datos ingresados, resultado obtenido y esperado |

Plantilla para registrar un defecto:

```text
ID del caso:
Resultado:
Severidad:
Usuario y rol:
Datos usados:
Pasos exactos:
Resultado obtenido:
Resultado esperado:
Evidencia:
Caso relacionado que tambien debe repetirse:
```

## 4. Conceptos que el usuario debe conocer

### 4.1 Cuenta financiera y cuenta de visita

- **Cuenta financiera:** lugar real donde Logic guarda dinero, como Caja menor,
  Nequi o un banco. Su saldo se obtiene sumando movimientos activos.
- **Cuenta de visita:** cuenta comercial de un cliente durante su visita. Contiene
  la sala, productos, cortesias, pagos y saldo pendiente.

No son el mismo concepto. Una visita puede recibir varios pagos dirigidos a
distintas cuentas financieras.

### 4.2 Ledger o libro de movimientos

Es el historial que explica el saldo de una cuenta financiera. El saldo no se
edita directamente. Cambia mediante saldo inicial, ingresos, egresos, aportes,
transferencias, ajustes y anulaciones trazables.

Formula de control:

```text
saldo esperado = suma de movimientos activos con signo
```

### 4.3 Pedido, cobro y asignacion de pago

- **Pedido:** agrega deuda y descuenta inventario cuando corresponde. No significa
  que el dinero ya se recibio.
- **Cobro:** confirma que Logic recibio dinero en una cuenta financiera.
- **Asignacion:** indica que parte del pago cubre la sala o cada producto. Permite
  pagar un concepto completo o solo una parte.

### 4.4 Abono de reserva

Es un pago recibido antes de abrir la cuenta de visita. Al abrir la cuenta, el
abono se muestra como ya pagado y no genera un segundo ingreso.

### 4.5 Cortesia

Conserva el precio comercial para saber cuanto se regalo, cobra cero y descuenta
inventario/costo. No es un pago de valor cero ni una venta cobrada.

### 4.6 Egreso, aporte, transferencia y reembolso

- **Egreso:** costo o gasto real del negocio.
- **Aporte que entra a Logic:** dinero del propietario depositado en una cuenta de
  Logic. Aumenta la cuenta, pero no las ventas.
- **Pago personal del propietario:** el propietario paga un gasto directamente.
  El gasto existe, pero ninguna cuenta de Logic debe disminuir.
- **Transferencia:** mueve dinero entre dos cuentas de Logic. El total de dinero
  del negocio no cambia y no es ingreso ni egreso.
- **Reembolsable:** Logic queda debiendo al propietario el dinero personal usado.
  Para devolverlo se registra un egreso de categoria `Reembolso a propietario`,
  pagado desde la cuenta real de Logic. Este pago no vuelve a contar como gasto
  operativo.
- **No reembolsable:** no queda deuda con el propietario.

### 4.7 Conciliacion y cierre diario

- **Saldo esperado:** lo que el sistema calcula a partir del ledger.
- **Saldo real:** lo contado en efectivo o visto en la aplicacion bancaria.
- **Diferencia:** `real - esperado`.
- **Conciliar:** comparar ambos valores, investigar diferencias y, si corresponde,
  registrar un ajuste con motivo.
- **Cierre diario:** fotografia auditada del dia. No borra ni reinicia los saldos.

Una cuenta puede mostrarse en el cierre por haber tenido movimientos ese dia,
aunque no tenga habilitada conciliacion permanente.

### 4.8 Producto vendible e insumo

- **Producto vendible:** aparece en el pedido, por ejemplo Coca-Cola o
  Salchipapa.
- **Insumo/materia prima:** se usa para preparar un producto, por ejemplo papa,
  salsa o empaque.

Las paginas `Compras de productos para venta` y `Compras de materias primas`
son distintas por esta razon.

### 4.9 Unidad de compra, consumo y conversion

La unidad de compra describe como llega el insumo; la unidad de consumo describe
como lo usa una receta.

```text
1 kg comprado = 1000 g de consumo
1 litro comprado = 1000 ml de consumo
```

El factor de conversion indica cuantas unidades de consumo contiene una unidad
de compra.

### 4.10 Stock, lote, vencimiento y FEFO

- **Stock fisico:** cantidad que todavia existe.
- **Stock vendible:** cantidad que puede usarse; excluye lotes vencidos.
- **Lote:** grupo de unidades recibidas juntas.
- **FEFO:** se consume primero el lote que vence primero.
- **Conteo fisico:** se escribe lo que realmente se conto y el sistema crea solo
  el ajuste por la diferencia, dejando auditoria.

### 4.11 Receta, merma y costo historico

- **Receta:** insumos y cantidades necesarios para una unidad vendible.
- **Merma:** consumo adicional esperado por desperdicio. En la implementacion:
  `cantidad efectiva = cantidad indicada * (1 + merma / 100)`. Si la receta usa
  250 g y se indica 10% de merma, descuenta y costea 275 g.
- **Snapshot de costo:** fotografia del costo al crear el item. Cambiar despues la
  receta, el precio o una compra no debe cambiar ese costo historico.

### 4.12 Ganancia y margenes

```text
ganancia bruta = venta cobrada - costo de venta
margen bruto = ganancia bruta / venta cobrada
utilidad operativa = ganancia bruta - egresos operativos + ajustes
margen operativo = utilidad operativa / ingresos operativos
```

Un costo incompleto puede sobreestimar la ganancia.

### 4.13 Centro de costo y regla de reparto

El centro de costo indica que area asumio un egreso: Salas, Cafeteria,
Administracion, Marketing o Mixto. Un gasto mixto se divide mediante porcentajes
manuales o una regla vigente. Los porcentajes deben sumar 100%.

### 4.14 Base caja

El estado de resultados actual usa **base caja**: una venta se reconoce cuando se
cobra. Los saldos pendientes se muestran aparte. Los egresos se reconocen por su
fecha registrada, incluso si fueron financiados directamente por un propietario.

## 5. Preparacion del ambiente

### 5.1 Requisitos

- Usar una base local o de pruebas, nunca produccion.
- Crear una copia de seguridad antes de iniciar si existen datos utiles.
- Tener frontend y backend iniciados y verificar `/health`.
- Probar en Chrome o Edge de escritorio y en emulacion movil de 390 x 844.
- Tener un usuario `admin` y un usuario `game_master` sin permisos financieros.
- Elegir una fecha de prueba sin cierre diario previo. Identificarla como
  `FECHA_PRUEBA`.
- Usar el prefijo `REG-<fecha>-` en nombres y descripciones.

### 5.2 Datos base recomendados

Si la base no esta limpia, los valores siguientes deben verificarse como
**deltas** respecto al valor anotado antes de cada prueba.

| Entidad | Dato sugerido |
| --- | --- |
| Cuenta | `REG Caja`, efectivo, saldo inicial $500.000, disponible para cobros, conciliable |
| Cuenta | `REG Nequi`, billetera digital, saldo inicial $100.000, disponible para cobros, conciliable |
| Cuenta | `REG Fuerte`, efectivo, saldo inicial $1.000.000, no disponible para cobros |
| Producto directo | `REG Cola`, precio $5.000, controla inventario y vencimiento, minimo 5 botellas |
| Producto preparado | `REG Salchipapa`, precio $20.000, sin control directo de inventario |
| Insumo | `REG Papa`, compra kg, consumo g, conversion 1000, minimo 500 g |
| Insumo | `REG Salchicha`, compra/consumo unidad, conversion 1 |
| Insumo | `REG Salsa`, compra litro, consumo ml, conversion 1000 |
| Insumo | `REG Empaque`, compra/consumo unidad, conversion 1 |
| Reserva | sala existente, total $144.000, cliente `REG Cliente` |

### 5.3 Hoja de control inicial

Antes del recorrido principal anotar:

| Valor | Inicial | Final esperado/obtenido |
| --- | ---: | ---: |
| Saldo REG Caja | | |
| Saldo REG Nequi | | |
| Saldo REG Fuerte | | |
| Stock REG Cola | | |
| Stock REG Papa | | |
| Stock REG Salchicha | | |
| Stock REG Salsa | | |
| Stock REG Empaque | | |

### 5.4 Repetir una corrida sin contaminar resultados

- Asignar un identificador distinto a cada corrida, por ejemplo
  `REG-20260827-A` y `REG-20260827-B`.
- No reutilizar una fecha que ya tenga cierre diario, salvo que se restaure la
  copia de la base tomada antes de la prueba.
- No eliminar manualmente filas para "limpiar" una prueba fallida. Primero
  comprobar anulaciones y reversiones, porque esas son parte de la regresion.
- Para una corrida completamente nueva, restaurar el backup o usar otra base de
  pruebas y otro identificador.
- Guardar los valores iniciales de la hoja de control con cada corrida; no asumir
  que siguen siendo los del ejemplo.

## 6. Recorrido critico de humo

Ejecutar este bloque despues de cada despliegue antes de una regresion completa.

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| SMK-01 | Iniciar sesion como admin y abrir Reservas, Cuentas/visitas, Productos, Cuentas financieras y Dashboard financiero. | Todas cargan sin error de consola ni respuesta 500. |
| SMK-02 | Crear una reserva, registrar un abono de $50.000 a REG Nequi y abrir su cuenta. | Nequi aumenta $50.000; la visita muestra el abono una sola vez y saldo $94.000. |
| SMK-03 | Agregar una REG Cola vendida a la visita. | La deuda aumenta $5.000 y el stock baja una unidad; ninguna cuenta financiera cambia. |
| SMK-04 | Cobrar la REG Cola a REG Caja seleccionando el concepto. | Caja aumenta $5.000; el concepto queda pagado y el stock no vuelve a bajar. |
| SMK-05 | Anular el pago con motivo. | Caja vuelve al saldo anterior; el concepto vuelve a estar pendiente; inventario no cambia. |
| SMK-06 | Consultar Estado de resultados y Dashboard financiero para FECHA_PRUEBA. | El abono aparece como venta de sala cobrada; el pago anulado no aparece como venta activa. |

## 7. Casos de regresion por modulo

### Modulo 01 - Cuentas financieras y ledger

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| FIN-01 | Crear `REG Caja` con saldo inicial $500.000. | Se crea una sola cuenta, saldo $500.000 y movimiento `Saldo inicial` por +$500.000. | CIE-01, REP-01 |
| FIN-02 | Crear `REG Fuerte` con $1.000.000 y desmarcar disponibilidad para cobros. | Esta activa y visible en finanzas, pero no aparece como cuenta destino al cobrar una visita o reserva. | RES-02, PAG-01 |
| FIN-03 | Editar nombre, tipo y opciones de REG Caja. | Cambia configuracion sin alterar saldo ni movimientos historicos. No existe campo para editar saldo. | FIN-04 |
| FIN-04 | Abrir movimientos y filtrar por fecha y tipo. | La tabla muestra solo coincidencias; tipos y estados visibles estan en espanol; el placeholder no aparece como una opcion seleccionable. | UI-02 |
| FIN-05 | Desactivar temporalmente una cuenta e intentar usarla en un cobro. | No aparece o el backend rechaza el cobro. Reactivarla no altera historial ni saldo. | PAG-01 |
| FIN-06 | Comparar saldo mostrado con la suma firmada de movimientos activos. | Coinciden exactamente; movimientos anulados no participan. | XMOD-01 |

### Modulo 02 - Reservas y abonos

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| RES-01 | Crear/usar reserva de $144.000. Abrir `Registrar abono`. | Muestra total, pagado, pendiente, cuenta, monto y descripcion. La descripcion sugerida incluye el nombre de la sala. | VIS-01 |
| RES-02 | Registrar $50.000 en REG Nequi. | Pagado $50.000, pendiente $94.000; aparece en historial y Nequi aumenta $50.000 una sola vez. | FIN-06, REP-02 |
| RES-03 | Registrar segundo abono de $30.000 en REG Caja. | Pagado total $80.000, pendiente $64.000 y dos filas de historial. | VIS-01 |
| RES-04 | Intentar abono cero, negativo, sin cuenta, superior al saldo y doble clic al confirmar. | Valores invalidos se bloquean; no hay pago ni movimiento duplicado. Un excedente no se acepta silenciosamente. | FIN-06 |
| RES-05 | Anular el abono de $30.000 indicando motivo. | El pago queda anulado, pagado vuelve a $50.000, pendiente a $94.000 y REG Caja revierte exactamente $30.000 sin borrar historial. | VIS-02, REP-02 |
| RES-06 | Verificar el selector de cuenta. | Solo incluye cuentas activas disponibles para cobros; nombres/opciones estan en espanol y el placeholder no figura como opcion. | UI-02 |

### Modulo 03 - Cuentas y visitas

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| VIS-01 | Desde la reserva con abonos pulsar `Abrir cuenta`. | Se crea una visita asociada; total sala $144.000, pagado igual a abonos confirmados y pendiente correcto. No se crea ingreso adicional. | FIN-06, PAG-02 |
| VIS-02 | Volver a pulsar `Abrir cuenta` para la misma reserva. | No crea otra visita; abre o informa la cuenta activa existente. | XMOD-02 |
| VIS-03 | Crear cuenta manual con nombre `REG Andrea`, ubicacion `Mesa 2` y observacion. | Se muestra con esos datos y total inicial $0. | PED-01 |
| VIS-04 | Crear cuenta manual sin nombre. | Se muestra como `Cuenta #<id>` sin romper la tabla. | UI-01 |
| VIS-05 | Editar nombre/ubicacion de una cuenta abierta y pulsar Actualizar. | Los datos cambian; otro usuario los ve al actualizar o reenfocar, sin polling continuo. | ACC-03 |
| VIS-06 | Intentar cerrar una visita con saldo pendiente sin motivo y luego como admin con motivo. | Sin motivo se bloquea; admin puede forzar cierre con motivo trazable. Una visita pagada puede cerrarse normalmente. | CIE-04 |
| VIS-07 | Cancelar una visita abierta con motivo. | Estado CANCELADA, no admite nuevos pedidos/pagos y revierte los movimientos de inventario de items activos. Los pagos existentes no se borran silenciosamente. | INV-06, PED-06 |

### Modulo 04 - Pedidos y cortesias

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| PED-01 | En REG Andrea buscar REG Cola, elegir cantidad 2 y agregar venta. | Se crea item por 2, comercial/cobrado $10.000 y deuda +$10.000. No cambia ninguna cuenta financiera. | INV-04, PAG-03 |
| PED-02 | Cambiar cantidad de 2 a 3 y luego a 2. | Importes e inventario cambian solo por la diferencia; no se duplican movimientos. | INV-05 |
| PED-03 | Agregar una REG Cola como cortesia por cumpleanos. | Cobra $0, conserva valor comercial $5.000, registra motivo y descuenta una unidad. | INV-04, GAN-04 |
| PED-04 | Elegir motivo `Otro` sin descripcion y despues con descripcion. | Sin descripcion se bloquea; con descripcion se crea. | UI-03 |
| PED-05 | Iniciar como game master sin permiso de cortesia. | La accion no aparece y una llamada directa tambien debe ser rechazada. | ACC-02 |
| PED-06 | Cancelar un item no pagado con motivo. | Queda cancelado con trazabilidad, deja de sumar a la cuenta y repone inventario exacto. | INV-06 |
| PED-07 | Cobrar parcialmente un item e intentar editarlo o cancelarlo directamente. | Se bloquea para proteger la asignacion del pago. Primero debe anularse/corregirse el pago. | PAG-07 |
| PED-08 | Cambiar luego el precio de REG Cola en Productos. | Items anteriores conservan nombre/precio snapshot; nuevos items usan el precio nuevo. | COS-03 |

### Modulo 05 - Pagos, caja y division entre personas

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| PAG-01 | Abrir Cobrar y revisar cuentas destino. | Solo cuentas activas y disponibles; REG Fuerte no aparece. | FIN-02 |
| PAG-02 | En una visita de reserva revisar `Conceptos pendientes`. | La sala aparece como concepto con saldo restante despues de abonos; los abonos previos aparecen separados. | RES-03 |
| PAG-03 | Seleccionar todos los productos con el checkbox del encabezado. | Selecciona todos los conceptos pagables, muestra suma exacta y permite desmarcar uno sin perder los demas. | UI-04 |
| PAG-04 | Seleccionar REG Salchipapa de $20.000, escribir recibido $10.000 y cobrar a REG Caja. | Solo se asignan $10.000; el mismo concepto queda con $10.000 pendiente y Caja aumenta $10.000. | REP-03, EDR-02 |
| PAG-05 | Otra persona paga los $10.000 restantes del mismo concepto a REG Nequi. | El concepto queda pagado; ambos pagos y cuentas conservan sus valores separados. | FIN-06 |
| PAG-06 | Pagar $30.000 de la sala y despues un valor generico del saldo sin seleccionar items. | Cada pago reduce el saldo una sola vez y se asigna correctamente al saldo de visita. | REP-02 |
| PAG-07 | Intentar asignar mas del pendiente de un concepto o pagar mas del pendiente total. | Se bloquea sin crear pago ni movimiento financiero. | FIN-06 |
| PAG-08 | Completar todos los conceptos usando dos cuentas financieras. | Pendiente $0 y estado PAGADA; cerrar sigue siendo una accion explicita. | VIS-06, CIE-04 |
| PAG-09 | Anular como admin uno de los pagos con motivo. | El pago queda anulado, la cuenta financiera revierte el valor, asignaciones se liberan y la visita vuelve a PARCIALMENTE PAGADA/ABIERTA. Inventario no cambia. | PED-07, REP-03 |
| PAG-10 | Pulsar Confirmar cobro dos veces rapidamente. | Solo existe un pago/movimiento por la operacion. Si se duplica, registrar S1. | XMOD-02 |

### Modulo 06 - Egresos, aportes y transferencias

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| MOV-01 | Registrar egreso de mantenimiento de salas por $40.000, pagado totalmente desde REG Caja. | El total se asume desde la cuenta seleccionada sin pedir reparto adicional; Caja baja $40.000 y el egreso es Salas. | EDR-03 |
| MOV-02 | Activar `Dividir/Incluir dinero del propietario` para un egreso de $300.000: $200.000 REG Caja y $100.000 propietario reembolsable. | Los campos de propietario solo aparecen con el checkbox; Caja baja $200.000, gasto total es $300.000 y deuda reembolsable $100.000. | MOV-08, EDR-04 |
| MOV-03 | Repetir con aporte no reembolsable. | Registra gasto real y financiacion personal, no deuda por devolver ni movimiento ficticio en una cuenta Logic. | EDR-04 |
| MOV-04 | Intentar guardar fuentes cuya suma no sea igual al total. | Se bloquea sin movimientos parciales. | XMOD-02 |
| MOV-05 | Editar monto, fecha, categoria, centro y fuentes de un egreso. | Revierte efectos anteriores y aplica los nuevos una sola vez; historial/estado sigue trazable. | FIN-06, EDR-03 |
| MOV-06 | Anular/eliminar el egreso corregido. | No desaparece silenciosamente: queda anulado y sus movimientos dejan de afectar saldos/reportes. | REP-01 |
| MOV-07 | Registrar aporte de propietario de $100.000 que entra a REG Nequi. | Nequi sube $100.000; aportes suben, ventas/ingresos operativos no. Editar y anular recalcula el saldo. | EDR-05, DAS-03 |
| MOV-08 | Devolver $100.000 al propietario mediante egreso `Reembolso a propietario` desde REG Caja. | Caja baja $100.000; disminuye la deuda economica al propietario y no duplica egresos operativos. | EDR-05 |
| MOV-09 | Transferir $50.000 de REG Caja a REG Fuerte. | Caja -$50.000, Fuerte +$50.000, total combinado sin cambio; no afecta ventas ni egresos. | EDR-05, CIE-02 |
| MOV-10 | Intentar transferencia origen=destino y monto cero/negativo. | Se bloquea sin movimientos. | XMOD-02 |
| MOV-11 | Editar transferencia a $30.000 y luego anularla. | Ambos lados se corrigen en conjunto; al anular, ninguno afecta saldo. | FIN-06 |
| MOV-12 | Probar todos los dropdowns de la pantalla. | Categorias, centros, tipos de cuenta y aportes se muestran en espanol; placeholders no aparecen entre opciones. | UI-02 |
| MOV-13 | Filtrar egresos por categoria y centro de costo. | Solo muestra coincidencias, incluidos registros antiguos `Sin asignar`. | REP-01 |

### Modulo 07 - Inventario base

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| INV-01 | Crear un producto inventariable nuevo despues de existir IDs previos. | Se crea sin error de llave primaria duplicada y aparece una sola vez. | COM-01 |
| INV-02 | Crear producto con stock inicial 10 y minimo 3. | Stock 10 explicado por movimiento inicial; no es un numero editable sin auditoria. | REP-04 |
| INV-03 | Registrar entrada manual +5 y salida -2 con motivo. | Stock termina en 13 y auditoria contiene ambos movimientos, fecha, usuario y motivo. | REP-05 |
| INV-04 | Vender y dar cortesia de producto directo. | Cada unidad descuenta una vez al crear pedido; cobrar no vuelve a descontar. | PED-01, PED-03 |
| INV-05 | Aumentar/disminuir cantidad del item. | Crea movimientos solo por la diferencia y conserva stock correcto. | PED-02 |
| INV-06 | Cancelar item y cancelar cuenta con items activos. | Revierte exactamente todos los movimientos asociados, incluidos lotes; una segunda cancelacion no duplica reposicion. | VIS-07 |
| INV-07 | Ejecutar conteo fisico: sistema 13, real 11. | Stock queda 11 y se crea ajuste -2 con motivo, no se reemplaza historial. Repetir real 11 crea diferencia cero o evita movimiento inutil. | REP-05 |
| INV-08 | Abrir auditoria con muchos registros, cambiar pagina y filtros. | Usa paginacion/filtros; no renderiza indefinidamente todos los movimientos. | UI-05 |

### Modulo 08 - Lotes y vencimientos

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| LOT-01 | Editar REG Cola y habilitar control de vencimiento. | Se muestran configuracion de alertas y textos en espanol. | COM-02 |
| LOT-02 | En compra seleccionar REG Cola. Pasar el cursor por vencimiento/lote. | Campos se habilitan solo porque controla vencimiento; tooltip explica la condicion. | COM-02 |
| LOT-03 | Recibir 24 unidades en lote A y 12 en lote B, con B venciendo antes. | Stock total +36 y se crean dos lotes independientes. | COM-03 |
| LOT-04 | Vender una unidad. | Descuenta primero el lote B por FEFO aunque A se haya creado primero. | COS-02 |
| LOT-05 | Crear/usar un lote ya vencido con cantidad fisica. | No cuenta como stock vendible ni puede consumirse; se muestra como vencido/pendiente de baja. | REP-04 |
| LOT-06 | Dar de baja vencidos. | Stock fisico se ajusta mediante movimiento trazable; lote/historial no se borra. | REP-05 |
| LOT-07 | Configurar lote dentro de alerta y critico. | Productos/reportes muestran estado correcto segun dias configurados, sin confundirlo con stock bajo. | REP-04 |

### Modulo 09 - Compras de productos para venta

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| COM-01 | Abrir `Compras de productos para venta`. | Titulo y contenedores siguen estilo admin; campos tienen padding y no se superponen en desktop/movil. | UI-01 |
| COM-02 | Agregar REG Cola y un producto sin vencimiento. | Vencimiento/lote solo habilitados para REG Cola; tooltip informa el motivo. | LOT-02 |
| COM-03 | Ingresar cantidad 30 y Total linea $72.000. | `Total linea` aparece antes de `Costo unitario`; costo calculado y solo lectura = $2.400. | COS-02 |
| COM-04 | Confirmar recepcion con varias lineas/lotes. | No aparece `FOR UPDATE is not allowed with GROUP BY`; stock y lotes aumentan exactamente por linea. | LOT-03 |
| COM-05 | Pagar compra completa desde REG Nequi. | Nequi baja por total, se crea egreso Cafeteria/Insumos y stock aumenta en la misma operacion. | MOV-13, EDR-03 |
| COM-06 | Dividir pago entre cuenta Logic y propietario. | Suma de fuentes = total; solo la parte Logic reduce su cuenta y la parte personal queda identificada. | MOV-02 |
| COM-07 | Confirmar con doble clic/reintento. | La recepcion, lotes, movimientos y egreso se crean una sola vez. Duplicacion es S1. | XMOD-02 |

### Modulo 10 - Cierre diario y conciliacion

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| CIE-01 | Abrir FECHA_PRUEBA antes de cerrar. | Resumen incluye ventas cobradas, egresos, aportes, cortesias, visitas y pendientes del dia. | REP-01 |
| CIE-02 | Revisar conciliacion por cuenta. | Aparecen todas las cuentas con movimientos del dia aunque no tengan conciliacion habilitada. Entradas, salidas y transferencias coinciden con ledger. | FIN-06 |
| CIE-03 | Abrir `Ver movimientos` de cada cuenta. | Lista explica los totales del dia y permite identificar abonos de reserva, cobros, egresos, aportes y transferencias. | RES-02, PAG-04 |
| CIE-04 | Dejar una visita con saldo pendiente e intentar cerrar. | Se advierte/bloquea; solo admin puede aceptar saldos abiertos mediante control explicito. | VIS-06 |
| CIE-05 | Escribir saldo real diferente al esperado. | Diferencia = real - esperado. El input tiene espacio suficiente y no se reduce a una columna inutilizable. | UI-01 |
| CIE-06 | Cerrar con diferencia sin autorizacion y despues con ajuste/motivo o permiso. | Primero se bloquea; despues queda decision trazable y, si hay ajuste, el ledger/saldo esperado se actualiza. | FIN-06 |
| CIE-07 | Confirmar cierre y volver a abrir la fecha. | Se muestra cierre guardado; no permite duplicarlo ni reinicia saldos. | DAS-06 |
| CIE-08 | Registrar abono de reserva en fecha sin visita y previsualizar cierre. | Se incluye como entrada/venta de sala del dia sin exigir abrir cuenta. | RES-02, EDR-01 |

### Modulo 11 - Dashboard, reportes y exportaciones

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| REP-01 | Abrir Dashboard/reportes y filtrar FECHA_PRUEBA. | Saldos, ingresos, egresos, aportes, cortesias, visitas y cierres cargan sin mezclar clasificaciones. | EDR-05 |
| REP-02 | Revisar ventas de salas con dos abonos y un pago de visita. | Cuenta solo pagos confirmados; no duplica abonos al abrir visita. Ranking muestra la sala real. | RES-03, VIS-01 |
| REP-03 | Revisar productos con pagos parciales. | Ranking de cafeteria muestra productos, no mesas; importes pagados/pendientes son consistentes. | PAG-04 |
| REP-04 | Comparar alerta de inventario con lista de Productos. | Stock actual se obtiene de movimientos y coincide en ambas pantallas; no muestra cero si hay 18/30 unidades. | INV-02, LOT-05 |
| REP-05 | Filtrar movimientos de inventario por fecha/tipo y paginar. | Incluye entradas, ventas, cortesias, reversiones, conteos y bajas sin tabla infinita. | INV-08 |
| REP-06 | Consultar ranking mas/menos vendido de productos y salas. | Cafeteria agrupa productos; salas agrupa salas de escape. Cambiar orden funciona. | GAN-03 |
| REP-07 | Exportar cada reporte CSV. | Descarga archivo legible en Excel, con filtros y cifras iguales a pantalla; no guarda un documento permanente en servidor. | GAN-06, EDR-07 |
| REP-08 | Probar rango sin datos, rango grande y filtros combinados. | Estado vacio claro, sin error/solapamiento; paginacion conserva filtros. | UI-05 |

### Modulo 12 - Insumos y materias primas

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| INS-01 | Abrir `Insumos` y crear REG Papa: compra kg, consumo g, conversion 1000, inventariable y stock inicial 0. | Se crea activa por defecto; el formulario de creacion no muestra un campo Activo que confunda. | CIN-01 |
| INS-02 | Crear REG Salsa: compra litro, consumo ml, conversion 1000. | La ayuda indica que una unidad comprada equivale a 1000 unidades consumidas. | REC-02 |
| INS-03 | Crear REG Empaque: unidad/unidad, conversion 1 y stock inicial 10. | Stock 10 y movimiento inicial trazable en unidades de consumo. | REC-02 |
| INS-04 | Intentar conversion 0/negativa, minimo negativo y nombre/unidades vacios. | Se bloquea y no crea un registro parcial. | XMOD-02 |
| INS-05 | Crear un insumo sin control de inventario. | Puede usarse para costeo si tiene costo, pero no muestra/descuenta stock. | REC-02, RIN-03 |
| INS-06 | Editar un insumo existente, cambiar minimo y activar control de vencimiento. | Conserva stock e historial; las compras futuras habilitan lote/vencimiento. | CIN-02 |
| INS-07 | Eliminar un insumo sin uso y uno usado por receta/movimientos. | El primero puede eliminarse; el segundo se desactiva/conserva historico y no aparece para recetas nuevas. | REC-05 |

### Modulo 13 - Compras de materias primas

Preparar las siguientes compras en una base limpia o verificar sus deltas:

| Insumo | Cantidad comprada | Total linea | Conversion | Stock de consumo esperado | Costo por unidad de consumo |
| --- | ---: | ---: | ---: | ---: | ---: |
| REG Papa | 2 kg | $12.000 | 1000 g/kg | 2.000 g | $6/g |
| REG Salchicha | 20 unidades | $20.000 | 1 | 20 unidades | $1.000/unidad |
| REG Salsa | 1 litro | $8.000 | 1000 ml/l | 1.000 ml | $8/ml |
| REG Empaque | 10 unidades | $5.000 | 1 | 10 unidades | $500/unidad |

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| CIN-01 | Registrar las cuatro lineas anteriores sin pago inmediato. | Stock aumenta segun conversion; compra total $45.000, estado Pendiente y ninguna cuenta financiera cambia. | REC-02 |
| CIN-02 | Para un insumo con vencimiento ingresar lote/fecha; para otro sin control intentar hacerlo. | Campos solo se habilitan cuando aplica y muestran tooltip. | RIN-04 |
| CIN-03 | Verificar orden de columnas y calculos. | Total linea aparece antes del costo unitario calculado; costo = total linea / cantidad convertida. No se edita ni se guarda como dato independiente. | REC-02 |
| CIN-04 | Registrar otra compra pagada completamente desde REG Caja. | Caja baja por el total; se crea egreso categoria Insumos, centro Cafeteria; inventario aumenta. | MOV-01, EDR-03 |
| CIN-05 | Registrar compra dividida entre REG Caja y propietario reembolsable. | Solo la parte Logic baja Caja; gasto total y deuda reembolsable incluyen la compra completa. | MOV-02 |
| CIN-06 | Intentar cantidad/total cero, lineas repetidas invalidas, suma de pago distinta o doble confirmacion. | Se bloquea o crea una sola recepcion atomica; nunca stock sin compra/egreso correspondiente. | XMOD-02 |

### Modulo 14 - Recetas y fichas tecnicas

Receta de referencia para una REG Salchipapa:

| Insumo | Cantidad base | Merma | Cantidad efectiva | Costo esperado |
| --- | ---: | ---: | ---: | ---: |
| REG Papa | 250 g | 10% | 275 g | $1.650 |
| REG Salchicha | 1 unidad | 0% | 1 | $1.000 |
| REG Salsa | 20 ml | 0% | 20 ml | $160 |
| REG Empaque | 1 unidad | 0% | 1 | $500 |
| **Total** | | | | **$3.310** |

Con precio $20.000, la ganancia bruta unitaria esperada es $16.690 y el margen
83,45%. Con margen objetivo 60%, el precio sugerido es
`ceil(3310 / 0,40) = $8.275`.

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| REC-01 | Seleccionar REG Salchipapa y guardar una receta vacia como borrador. | Puede existir borrador incompleto, pero Activar se bloquea. | DAS-05 |
| REC-02 | Agregar los cuatro insumos de la tabla. | Preview muestra unidades de consumo, costos unitarios vigentes, cantidades efectivas y costo directo $3.310. | COS-01 |
| REC-03 | Cambiar merma de papa entre 0% y 10%. | La cantidad base sigue 250 g; solo el consumo/costo efectivo cambia de 250 a 275 g. | RIN-01 |
| REC-04 | Probar margen objetivo 60%, 0%, 100% y fuera de rango. | 60% calcula $8.275; 0/100 o invalidos se bloquean. | GAN-02 |
| REC-05 | Intentar insumo repetido, cantidad cero/negativa o insumo inactivo. | Se bloquea sin duplicar lineas. | INS-07 |
| REC-06 | Guardar borrador valido y activarlo. | Queda una sola receta activa versionada; se habilita para ventas futuras. | RIN-01 |
| REC-07 | Modificar luego la receta y activar nueva version. | Crea/activa nueva version; ventas anteriores conservan receta/costo anterior y futuras usan la nueva. | COS-03 |
| REC-08 | Crear receta con un insumo sin compras/costo. | Preview alerta costo incompleto; no presenta como confiable la ganancia/precio sugerido. | GAN-05, DAS-05 |

### Modulo 15 - Descuento de inventario por receta

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| RIN-01 | Anotar stocks y vender 1 REG Salchipapa con la receta de referencia. | Descuenta 275 g papa, 1 salchicha, 20 ml salsa y 1 empaque al crear item. No descuenta una unidad de REG Salchipapa. | COS-01 |
| RIN-02 | Cambiar cantidad del item de 1 a 2. | Stocks reflejan exactamente el doble; volver a 1 repone solo una receta. | PED-02 |
| RIN-03 | Agregar cortesia de REG Salchipapa. | Descuenta la receta igual que una venta, aunque cobrado sea $0. | GAN-04 |
| RIN-04 | Con dos lotes de un insumo, vender una receta. | Consume primero el lote que vence antes por FEFO y muestra lote/movimiento correcto. | LOT-04 |
| RIN-05 | Intentar vender cantidad que requiere mas papa que la disponible. | Se bloquea y explica insumo, disponible y requerido; no crea item ni movimientos parciales. | XMOD-02 |
| RIN-06 | Cancelar item de receta con motivo. | Revierte cada insumo/lote exacto una sola vez y anula snapshot correspondiente. | COS-04 |
| RIN-07 | Cobrar un item ya creado y revisar stocks. | El pago no modifica inventario. | PAG-04 |

### Modulo 16 - Costo historico de venta

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| COS-01 | Abrir detalle del item REG Salchipapa creado con receta. | Muestra receta/version, componentes, costo total $3.310, ganancia $16.690 y margen aproximado 83,45%. | GAN-01 |
| COS-02 | Vender REG Cola recibida a $2.400/unidad. | Snapshot usa costo del lote/compra consumido y registra componente directo. | GAN-01 |
| COS-03 | Cambiar receta, precio de venta o registrar una compra mas costosa. | Items historicos conservan costo, ingreso y margen; nuevos items usan datos vigentes. | REC-07, PED-08 |
| COS-04 | Cancelar venta/cortesia. | Snapshot no se borra fisicamente: queda anulado y no cuenta en reportes activos. | GAN-03 |
| COS-05 | Vender producto sin costo disponible. | Permite flujo si esa es la regla vigente, marca `Costo incompleto` e identifica componente sin costo. | GAN-05, DAS-05 |

### Modulo 17 - Ganancia bruta de cafeteria

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| GAN-01 | Filtrar FECHA_PRUEBA con tipo Ventas. | Ventas, costo, ganancia y margen son suma de snapshots activos; no incluye salas. | COS-01, COS-02 |
| GAN-02 | Comprobar formulas manualmente para REG Salchipapa. | Ganancia = cobrado - costo; margen = ganancia/cobrado. Coincide tarjeta, grafica, ranking y detalle. | REC-04 |
| GAN-03 | Alternar ranking Mas rentables/Menos rentables y filtros producto/categoria. | Orden y filas cambian correctamente; items cancelados no cuentan. | REP-06 |
| GAN-04 | Filtrar Cortesias. | Cobrado $0, valor comercial separado, costo de cortesia visible y aporte neto disminuye por el costo. | PED-03, RIN-03 |
| GAN-05 | Incluir item con costo incompleto. | Tarjeta/tabla muestran alerta y no ocultan que la ganancia puede estar sobreestimada. | COS-05 |
| GAN-06 | Exportar CSV y sumar filas. | Coincide con filtros, resumen y detalle visibles. | REP-07 |
| GAN-07 | Probar mes, ano, rango y paginacion. | Fechas limite incluidas, filtros no se superponen visualmente y paginacion conserva seleccion. | UI-01 |

### Modulo 18 - Centros de costo y clasificacion de egresos

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| CLA-01 | Crear mantenimiento de sala como centro Salas. | 100% del egreso se asigna a Salas. | EDR-03 |
| CLA-02 | Ver compras de productos e insumos creadas. | Quedan por defecto en categoria Insumos y centro Cafeteria. | COM-05, CIN-04 |
| CLA-03 | Crear arriendo como Mixto con reparto manual 70% Salas, 30% Cafeteria, 0% Admin. | Campos de porcentaje solo aparecen al elegir Mixto/manual; suma 100% y valores asignados correctos. | RGL-04 |
| CLA-04 | Probar porcentajes 70+20+0, negativos o mayores a 100. | Se bloquea sin crear egreso/movimientos. | XMOD-02 |
| CLA-05 | Reclasificar un egreso antiguo `Sin asignar`. | Conserva monto/financiacion, cambia clasificacion y desaparece de alerta de pendientes. | DAS-05 |
| CLA-06 | Revisar reembolso a propietario. | Tiene categoria separada y Administracion por defecto; no se mezcla con egresos operativos. | MOV-08, EDR-05 |

### Modulo 19 - Reglas de reparto

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| RGL-01 | Crear regla `REG Arriendo 70/30`: Arriendo, vigencia que incluya FECHA_PRUEBA, 70% Salas, 30% Cafeteria. | Regla activa guardada y suma visible 100%. | CLA-03 |
| RGL-02 | Intentar guardar 90%, 110%, fecha final anterior o regla activa solapada para misma categoria. | Se bloquea con mensaje en espanol. | XMOD-02 |
| RGL-03 | Usar Simular con $300.000 en FECHA_PRUEBA. | Salas $210.000, Cafeteria $90.000, Admin $0. | EDR-03 |
| RGL-04 | Registrar egreso mixto de Arriendo usando regla. | Guarda snapshot de regla y porcentajes; resumen por area coincide con simulacion. | EDR-03 |
| RGL-05 | Registrar otro egreso mixto con override manual 50/50. | Respeta manual y no obliga a usar regla. | CLA-03 |
| RGL-06 | Cambiar regla vigente a 60/40 despues del egreso. | El egreso anterior permanece 70/30; nuevos egresos usan 60/40. | EDR-06 |
| RGL-07 | Crear egreso mixto en fecha/categoria sin regla usando modo regla. | Queda pendiente de clasificacion y genera alerta; no inventa porcentajes. | DAS-05 |

### Modulo 20 - Estado de resultados

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| EDR-01 | Filtrar FECHA_PRUEBA/mes en area General. | Ventas salas = pagos confirmados de reserva + asignaciones a sala; ventas cafeteria = pagos confirmados asignados a items. | RES-02, PAG-04 |
| EDR-02 | Dejar media REG Salchipapa pendiente. | Solo la parte cobrada aparece como venta y reconoce costo proporcional; saldo restante aparece separado. | PAG-04 |
| EDR-03 | Ver costo, ganancia, egresos y resultado. | `ingresos - costo cafeteria - egresos + ajustes = resultado`; categorias/areas suman el total. | GAN-01, RGL-04 |
| EDR-04 | Revisar egreso pagado por propietario. | Se descuenta como egreso operativo aunque no haya salido de una cuenta Logic. | MOV-02 |
| EDR-05 | Revisar aportes, transferencias, reembolsos, cortesias y saldos pendientes. | Aparecen en Movimientos separados; aportes/transferencias/reembolsos no inflan ventas ni utilidad. | MOV-07, MOV-09 |
| EDR-06 | Cambiar entre General, Salas y Cafeteria. | Cada area muestra ingresos/costos/egresos asignados; pendientes de reparto se descuentan en General y se advierten en areas. | RGL-06 |
| EDR-07 | Probar dia, mes, ano, rango y Exportar CSV. | Mismos totales que pantalla; rangos largos agregan por mes y cortos por dia segun reporte. | REP-07 |
| EDR-08 | Generar costos incompletos, egreso sin reparto y visita pendiente. | Muestra advertencias visibles y explica que el resultado puede estar sobreestimado/incompleto. | DAS-05 |

### Modulo 21 - Dashboard financiero avanzado

| ID | Caso y pasos | Resultado esperado | Regresion relacionada |
| --- | --- | --- | --- |
| DAS-01 | Abrir Dashboard financiero por mes en General. | KPI de salas, cafeteria, otros ingresos, costo, ganancia, egresos, utilidad, margenes, cortesias y pendientes cargan. | EDR-01 |
| DAS-02 | Comparar cada KPI con Estado de resultados para el mismo rango/area. | Coinciden exactamente. Base indicada como Caja. | EDR-03 |
| DAS-03 | Registrar aporte y transferencia dentro del rango, actualizar dashboard. | No cambian ventas ni utilidad. | MOV-07, MOV-09 |
| DAS-04 | Activar Comparar con periodo anterior. | Usa periodo inmediatamente anterior de igual duracion; muestra variacion o `Sin base comparable` si anterior es cero. | EDR-07 |
| DAS-05 | Con datos validos provocar producto sin costo, mixto sin regla, visita pendiente y cierre faltante. Para receta activa incompleta, egreso sin centro y compra sin costo usar solo fixture legacy controlado. | Cada chip muestra conteo correcto; al corregir datos y actualizar desaparece/reduce. Sin fixture, las alertas imposibles de crear por UI deben permanecer en cero. | COS-05, RGL-07, CIE-07 |
| DAS-06 | Revisar graficas y detalle mensual, incluido un mes sin movimientos. | Utilidad, ventas por area, egresos por categoria y centro coinciden con tablas; mes sin datos aparece en cero, no desaparece. | EDR-03 |
| DAS-07 | Revisar rankings. | Productos ordenados por ganancia bruta cobrada; salas por ventas cobradas. Las sumas coinciden con KPI cuando hay <=10 elementos o se entiende el limite visual. | GAN-03, REP-06 |
| DAS-08 | Cambiar area General/Salas/Cafeteria. | Oculta rankings no aplicables y recalcula KPI/graficas sin mezclar areas. | EDR-06 |
| DAS-09 | Exportar CSV. | KPI, series, categorias, rankings y alertas coinciden con pantalla y rango. | REP-07 |
| DAS-10 | Probar desktop, tablet y 390 x 844. | Graficas responden, textos no se cortan/solapan y tablas usan scroll horizontal sin desbordar pagina. | UI-01 |

## 8. Pruebas transversales

### 8.1 Permisos y seguridad

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| ACC-01 | Acceder sin sesion a una URL `/admin/dashboard/...`. | Redirige/rechaza; no expone datos. |
| ACC-02 | Iniciar como game master. | Puede operar reservas, visitas y productos segun menu; no ve ni puede llamar endpoints financieros/admin exclusivos. Cortesias dependen de permiso explicito. |
| ACC-03 | Abrir misma visita con admin y game master. Modificar con uno y actualizar con otro. | No hay actualizacion en tiempo real obligatoria, pero Actualizar/refoco trae datos correctos sin perder cambios. |
| ACC-04 | Intentar anular pagos o forzar cierre pendiente como usuario no admin. | Backend rechaza aunque se manipule la UI. |

### 8.2 UI, idioma y accesibilidad operativa

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| UI-01 | Recorrer todas las pantallas en 1440 x 900, 1024 x 768 y 390 x 844. | Titulos consistentes, padding suficiente, sin texto superpuesto, botones alcanzables y scroll solo donde corresponde. |
| UI-02 | Abrir todos los dropdowns modificados. | Opciones visibles en espanol; label no se superpone al valor; placeholder sirve de guia pero no aparece como opcion confundible. |
| UI-03 | Provocar validaciones de formularios. | Mensajes comprensibles para usuario, preferiblemente en espanol; foco/estado no borra datos validos. |
| UI-04 | Usar selects, checkboxes, toggles y botones solo con teclado. | Orden de tab logico, foco visible, Enter/Espacio ejecutan controles y select-all tiene nombre accesible. |
| UI-05 | Probar tablas vacias, con 1 fila, muchas filas y textos largos. | Estado vacio, paginacion, wrapping y scroll funcionan sin crecer indefinidamente. |
| UI-06 | Durante una peticion lenta/doble clic. | Boton muestra/deshabilita estado de carga y evita duplicacion. Errores no aparecen como JSON crudo si pueden presentarse amigablemente. |

### 8.3 Atomicidad, auditoria y concurrencia

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| XMOD-01 | Para cada accion financiera/inventario anotar antes, accion y despues. | `despues = antes + delta`; tablas derivadas coinciden con ledger/movimientos. |
| XMOD-02 | Doble clic, refrescar durante confirmacion y repetir la misma accion cuando aplique. | No duplica pagos, compras, recepciones, lotes, transferencias ni movimientos. |
| XMOD-03 | Abrir una visita en dos ventanas y cobrar el mismo concepto casi simultaneamente. | Solo se cobra hasta el pendiente; la segunda operacion se rechaza/recarga, nunca sobreasigna. |
| XMOD-04 | Abrir una regla/egreso en dos ventanas y guardar cambios distintos. | No deja porcentajes invalidos ni movimientos huerfanos; el resultado final es coherente y auditable. |
| XMOD-05 | Revisar anulaciones/cancelaciones. | Conservan registro original y motivo; no hacen eliminacion fisica de hechos financieros o de inventario. |

## 9. Conciliacion final entre modulos

Ejecutar estas comprobaciones al terminar todos los casos:

| ID | Comprobacion | Resultado esperado |
| --- | --- | --- |
| FIN-C01 | Sumar movimientos activos por cada cuenta financiera. | Coincide con saldo de Cuentas financieras, cierre y dashboard general. |
| FIN-C02 | Sumar pagos de reserva y visita confirmados de FECHA_PRUEBA. | Coincide con ventas cobradas de salas/cafeteria segun asignacion; anulados no cuentan. |
| INV-C01 | Stock inicial + entradas - consumos + reversiones + ajustes - vencidos. | Coincide con Productos/Insumos y alertas de inventario. |
| COS-C01 | Sumar costo historico de items activos vendidos y cortesias. | Coincide con Ganancia cafeteria; cancelados no cuentan. |
| GAS-C01 | Sumar egresos activos por categoria y reparto. | Coincide con egresos del Estado de resultados y Dashboard financiero. |
| SEP-C01 | Sumar aportes, transferencias, reembolsos y cortesias. | Aparecen separados y no alteran ventas/utilidad salvo el costo real de cortesias y gasto original financiado por propietario. |
| CSV-C01 | Comparar pantalla, tabla, grafica y CSV para el mismo filtro. | No existen diferencias de periodo, area, redondeo o estado. |

## 10. Datos que requieren fixture controlado

La aplicacion debe bloquear ciertos estados invalidos. Por tanto, no se deben
crear manipulando formularios ni modificando una base con informacion real.

En una base descartable se pueden preparar antes de iniciar el servidor:

- un egreso antiguo con centro `UNASSIGNED`;
- una receta activa sin items o con un insumo sin costo;
- una compra legacy con total de linea cero/nulo;
- dos solicitudes simultaneas para el mismo pago/compra;
- un lote vencido con cantidad fisica positiva.

Si no existe un script de fixtures aprobado, marcar esos casos como `NO APLICA`
y verificar que los contadores sean cero. Que la UI impida crear estos datos es
en si mismo parte de la regresion.

## 11. Orden recomendado de ejecucion completa

Para evitar bloqueos por dependencias:

1. Preparacion, permisos y cuentas financieras.
2. Productos directos, inventario base, lotes y compras de productos.
3. Insumos, compras de materias primas y recetas.
4. Reserva, abonos y apertura de visita.
5. Pedidos directos, preparados y cortesias.
6. Pagos parciales, pagos completos y anulaciones.
7. Egresos, aportes, reembolsos y transferencias.
8. Clasificacion y reglas de reparto.
9. Reportes operativos y ganancia de cafeteria.
10. Estado de resultados y dashboard financiero.
11. Cierre diario como ultima operacion del dia de prueba.
12. Conciliacion final, exportaciones y pruebas responsive.

## 12. Regresion despues de una correccion

No es suficiente repetir solo el clic que fallo. Usar esta matriz minima:

| Area corregida | Repetir obligatoriamente |
| --- | --- |
| Cuenta financiera/ledger | FIN-06, CIE-02, EDR-05, DAS-02, FIN-C01 |
| Abono/pago/anulacion | RES-02/05, PAG-04/09, CIE-03, EDR-01, FIN-C02 |
| Pedido/cancelacion | PED-01/06, INV-04/06, COS-01/04, GAN-01 |
| Inventario/lotes/compra | INV-03/07, LOT-03/04/06, REP-04/05, INV-C01 |
| Insumo/receta/costo | CIN-01/03, REC-02/07, RIN-01/06, COS-03, GAN-01 |
| Egreso/reparto | MOV-01/05/06, CLA-03/05, RGL-04/06, EDR-03 |
| Estado de resultados | EDR-01 a EDR-08, DAS-02/06/09, CSV-C01 |
| UI responsive/dropdown | UI-01 a UI-06 en desktop y movil |

Despues de corregir:

1. repetir el caso que fallo con los mismos datos;
2. repetir su operacion inversa, por ejemplo crear/anular o consumir/revertir;
3. ejecutar la fila aplicable de la matriz;
4. comprobar que no quedaron datos duplicados del intento fallido;
5. adjuntar evidencia nueva al defecto y cerrarlo solo si los totales concilian.

## 13. Criterio de salida

La regresion se considera aprobada cuando:

- todos los casos de recorrido critico estan `OK`;
- no quedan defectos S1 o S2 abiertos;
- saldos financieros, stock, costos y reportes cierran numericamente;
- todos los flujos de anulacion/reversion fueron probados;
- permisos se validaron tambien en backend;
- CSV coincide con pantalla;
- desktop y movil no presentan bloqueos de operacion;
- cualquier S3/S4 pendiente esta documentado y aceptado para una iteracion futura.

## 14. Registro de ejecucion

| ID caso | Resultado | Fecha/hora | Usuario | Evidencia/defecto | Observaciones |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
| | | | | | |
| | | | | | |
