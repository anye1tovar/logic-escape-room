# Módulo 10 — Cierre diario y conciliación

## Objetivo

Permitir que al terminar la jornada el personal compare lo que el sistema espera con el dinero real disponible, revise movimientos y deje un cierre trazable.

---

## `DailyClose`

Representa el cierre de una fecha/jornada.

No reemplaza ni elimina las transacciones del día.

Guardar resumen pequeño:

- fecha;
- hora de cierre;
- usuario;
- ingresos operativos;
- egresos;
- aportes de propietarios;
- cortesías (valor comercial);
- cantidad de visitas;
- pendientes;
- estado.

---

## Conciliación por cuenta financiera

Modelo sugerido: `AccountReconciliation`.

Por cada cuenta con `reconciliationEnabled=true` mostrar:

- saldo esperado;
- entradas del día;
- salidas del día;
- transferencias;
- saldo real ingresado/contado;
- diferencia;
- observación.

Para efectivo, el usuario cuenta físicamente.

Ejemplo:

Caja menor:

- esperado $380.000
- real $365.000
- diferencia -$15.000

---

## Ver movimientos del día

Desde cada conciliación incluir `Ver movimientos`.

Mostrar únicamente movimientos relevantes de esa cuenta en la jornada:

- ingresos de reservas/visitas;
- egresos;
- transferencias;
- aportes;
- ajustes.

Así el empleado puede detectar un gasto no registrado antes de cerrar.

---

## Diferencias

No modificar saldo directamente para “cuadrar”.

Si después de revisar existe una diferencia:

- usuario autorizado puede generar `ADJUSTMENT` con motivo obligatorio;
- o cerrar con diferencia si tiene permiso explícito y dejarla registrada.

Recomendación MVP:

- cajero puede ingresar conteo real y revisar;
- cerrar con diferencia o crear ajuste requiere permiso administrativo.

---

## Cierre con cuentas abiertas

Antes de cerrar mostrar:

- número de visitas abiertas;
- visitas con saldo pendiente;
- monto pendiente.

Por defecto no cerrar si existen saldos pendientes sin confirmación administrativa.

---

## Nequi/Daviplata/Banco

La misma estructura puede usarse para conciliación manual mirando el saldo real en la aplicación externa.

No integrar APIs bancarias.

---

## Regla de saldos

El cierre diario no “reinicia” las cuentas financieras a cero.

El saldo de una cuenta continúa entre días.

`DailyClose` es un snapshot/resumen y evidencia de conciliación, no un borrado del ledger.

---

## UI mínima

### Pantalla `Cerrar día`

1. Resumen de ventas y egresos.
2. Estado de visitas abiertas.
3. Tarjeta por cuenta financiera.
4. Campo `Saldo real`.
5. Diferencia calculada.
6. `Ver movimientos`.
7. `Cerrar día`.

---

## Reglas técnicas

- Evitar doble cierre para misma fecha/jornada salvo reapertura administrativa explícita.
- Guardar los valores conciliados como snapshot para conservar qué vio/aceptó el usuario en ese momento.
- No generar Excel automáticamente ni almacenarlo al cerrar.
- No borrar movimientos al cerrar.

---

## Criterios de aceptación

1. Sistema espera Caja menor $200.000 y usuario cuenta $180.000.
2. Se muestra diferencia -$20.000.
3. Usuario abre movimientos del día y puede registrar un egreso faltante.
4. El esperado se recalcula.
5. Si queda diferencia, admin puede registrar ajuste con motivo o cerrar con diferencia según permiso.
6. El cierre queda guardado sin eliminar cuentas/pagos/movimientos históricos.
