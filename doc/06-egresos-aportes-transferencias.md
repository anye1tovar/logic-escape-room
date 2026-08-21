# Módulo 06 — Egresos, aportes de propietarios y transferencias

## Objetivo

Representar correctamente salidas de dinero, movimientos internos y dinero personal invertido por propietarios, sin distorsionar ventas ni saldos de Logic.

---

# A. Egresos

## Registro de gasto

Campos mínimos:

- fecha/hora;
- categoría;
- descripción;
- valor total;
- usuario;
- observación opcional.

Categorías pueden ser configurables después. Para MVP usar catálogo simple existente o enum básico.

---

## Fuentes de financiación del gasto

Un gasto puede pagarse con una o varias fuentes.

Ejemplo:

Arriendo $3.000.000:

- $2.000.000 desde Bancolombia Logic;
- $1.000.000 pagado personalmente por propietario.

Modelo sugerido:

`Expense`

`ExpenseFundingAllocation`

Tipos de fuente:

- `FINANCIAL_ACCOUNT`
- `OWNER_PERSONAL_FUNDS`

La suma de allocations debe ser igual al total del gasto.

---

## Gasto pagado desde una cuenta Logic

Genera `FinancialMovement EXPENSE` en esa cuenta.

---

## Gasto pagado directamente con dinero personal

Ejemplo: propietario paga $500.000 directamente al maestro.

Reglas:

- registra el gasto real de Logic;
- registra quién aportó el dinero;
- **no** genera salida de ninguna `FinancialAccount` de Logic;
- se clasifica como financiación/aporte del propietario;
- no se finge un ingreso y salida por una cuenta que nunca recibió el dinero.

---

# B. Aportes de propietarios

Hay dos modalidades.

## 1. Aporte que entra a Logic

Ejemplo: propietario deposita $1.000.000 a Nequi Logic.

Genera:

`FinancialMovement OWNER_CONTRIBUTION +1.000.000`

No clasificar como venta/ingreso operativo.

## 2. Pago externo en nombre de Logic

Ya cubierto como `OWNER_PERSONAL_FUNDS` dentro de un gasto.

---

## Reembolsable vs no reembolsable

Guardar propiedad simple:

- `REIMBURSABLE`
- `NON_REIMBURSABLE`

No implementar contabilidad formal de pasivos/patrimonio en MVP. Solo conservar el dato para reportes y decisiones futuras.

Campos opcionales:

- `ownerName` o `ownerUserId` si aplica;
- nota.

---

# C. Transferencias entre cuentas Logic

Ejemplo:

Caja menor → Caja fuerte $600.000.

Debe generar atómicamente:

- `TRANSFER_OUT -600.000` en Caja menor;
- `TRANSFER_IN +600.000` en Caja fuerte.

Reglas:

1. No es ingreso operativo.
2. No es egreso del negocio.
3. No cambia el dinero total de Logic.
4. Ambas partes deben compartir `transferId`.
5. No permitir cuenta origen = destino.
6. Validar saldo si la política del negocio no permite saldos negativos.

---

# D. Registro manual de otros movimientos

Puede existir una acción administrativa `Registrar movimiento manual` para casos excepcionales.

Debe ser la excepción, no el flujo normal.

Requiere:

- tipo permitido;
- cuenta financiera;
- valor;
- descripción;
- motivo;
- usuario.

No permitir movimientos manuales que dupliquen pagos que ya tienen su flujo específico.

---

## Reglas técnicas

- Gastos con múltiples fuentes deben guardarse atómicamente.
- Transferencia = dos movimientos atómicos ligados.
- Owner contribution separado de sales/revenue en reportes.
- No hard delete de movimientos financieros.

---

## Criterios de aceptación

1. Se registra arriendo $3M: $2M Bancolombia + $1M dinero personal.
2. Bancolombia disminuye $2M, no $3M.
3. Gasto reportado = $3M.
4. Aporte/pago personal reportado = $1M.
5. Se registra aporte $500.000 que sí entra a Nequi; Nequi aumenta $500.000 pero ventas no aumentan.
6. Se transfieren $600.000 Caja menor → Caja fuerte sin afectar ingresos/egresos totales del negocio.
