# Verificación de correcciones — 30/10/2026

- Servidor: compilación TypeScript y 17 pruebas de regresión HTTP/lógica.
- Cliente: TypeScript, build de producción y 5 pruebas de DOM, caché y formulario.
- PostgreSQL: 61 comprobaciones HTTP de solo lectura con admin, student y teacher; conexión TLS con certificado verificado y arranque real del servidor.
- Vite Preview: arranque y respuesta de rutas SPA, 10 recursos iniciales, iconos del manifiesto y service worker.
- Precaché PWA: 1327,95 KiB antes; 568,63 KiB después (reducción aproximada del 57 %).
- Sin operaciones de escritura contra los datos de producción. Las escrituras, rechazos y concurrencia se comprueban con una base simulada.
- Las migraciones de índices e integridad están preparadas para el despliegue y no se ejecutaron en producción.

Comandos reproducibles en README.md. Las pruebas cubren los casos descritos; no prueban la ausencia absoluta de errores ni sustituyen una prueba de escritura con PostgreSQL en un entorno de staging.
