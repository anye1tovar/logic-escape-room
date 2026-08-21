# Prompt base para implementar cada módulo con Codex

Usa este prompt junto con `00-README-MVP.md` y **solo el archivo del módulo que vas a implementar**.

---

## Prompt

Quiero implementar el módulo indicado en el archivo adjunto dentro del proyecto existente de Logic Escape Room.

Antes de modificar código:

1. Analiza la arquitectura actual del repositorio.
2. Identifica stack frontend/backend, ORM/base de datos, autenticación, roles, estructura de carpetas, convenciones, manejo de estado y estrategia de pruebas.
3. Identifica los modelos existentes que deben reutilizarse, especialmente reservas, productos, categorías y usuarios.
4. Compara el requerimiento del módulo con lo que ya existe y evita duplicar funcionalidades.
5. Propón un plan corto de implementación para **este módulo únicamente**.
6. Señala migraciones/cambios de esquema necesarios.
7. No implementes módulos posteriores del roadmap salvo una estructura mínima indispensable para no bloquear este módulo.

Durante la implementación:

- Respeta las reglas de negocio del archivo.
- Mantén el alcance de MVP.
- No agregues WebSockets, SSE, polling continuo, Redis, colas, cron jobs o infraestructura adicional sin necesidad explícita.
- Reutiliza los patrones existentes del repositorio.
- Las reglas críticas deben validarse en backend.
- Usa transacciones de base de datos cuando una operación deba crear/modificar varios registros de forma atómica.
- No hagas hard delete de información financiera/auditable cuando el requerimiento indique anulación o compensación.
- Mantén cambios pequeños y revisables.
- Agrega pruebas para los criterios de aceptación y reglas de negocio principales.

Al terminar:

1. Resume los archivos modificados.
2. Lista migraciones/comandos necesarios.
3. Indica cómo probar manualmente el módulo paso a paso.
4. Ejecuta las pruebas/lint/typecheck disponibles que correspondan.
5. Reporta cualquier limitación o deuda técnica detectada.
6. No continúes automáticamente con el siguiente módulo.

El objetivo es que yo pueda desplegar/probar cada módulo en Logic antes de iniciar el siguiente.
