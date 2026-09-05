# Roadmap - Costos, precios y ganancias

## Objetivo general

Llegar a reportes confiables de ganancias/perdidas y precios sugeridos, empezando por cafeteria y luego extendiendo a utilidad operativa del negocio completo.

---

## Orden recomendado

1. `12-insumos-materias-primas.md`
2. `13-compras-insumos-costos.md`
3. `14-recetas-fichas-tecnicas.md`
4. `15-descuento-inventario-por-receta.md`
5. `16-costo-historico-de-venta.md`
6. `17-ganancia-bruta-cafeteria.md`
7. `18-clasificacion-egresos-centros-costo.md`
8. `19-reglas-reparto-gastos-indirectos.md`
9. `20-estado-resultados.md`
10. `21-dashboard-financiero-avanzado.md`

---

## Hitos funcionales

### Hito 1 - Costeo de cafeteria

Incluye modulos 12 a 17.

Permite responder:

- cuanto cuesta producir un producto;
- cuanto margen deja;
- a cuanto deberia venderse;
- cuanto gano o perdio cafeteria en bruto;
- que productos son mas rentables.

### Hito 2 - Utilidad operativa

Incluye modulos 18 a 20.

Permite responder:

- cuanto gano/perdio el negocio en un periodo;
- cuanto corresponde a salas;
- cuanto corresponde a cafeteria;
- cuanto pesan arriendo, nomina y servicios;
- que gastos estan sin clasificar.

### Hito 3 - Visualizacion avanzada

Incluye modulo 21.

Permite responder rapido:

- como va el mes;
- que area vende mas;
- que margen tiene cafeteria;
- que productos o salas impulsan ventas;
- donde hay datos incompletos.

---

## Decision importante

El MVP debe iniciar con base caja:

```text
lo cobrado - lo pagado
```

Luego puede evolucionar a base devengo:

```text
lo vendido/incurrido aunque no este cobrado/pagado
```

Esto evita complejidad contable prematura y mantiene coherencia con el ledger ya implementado.
