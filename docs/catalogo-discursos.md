# Catálogo de referencias para discursantes

En `/discursantes`, la lupa del encabezado abre el catálogo en web y móvil. Permite filtrar por tema y buscar por título, autor, conferencia o palabras clave, sin distinguir mayúsculas ni tildes. Muestra siete referencias por página.

Los administradores pueden agregar referencias mediante el botón **Referencia** y seleccionar una para completar una asignación nueva o en edición. Seleccionar no guarda automáticamente al discursante: se debe elegir el miembro, tema, fecha y duración y pulsar **Asignar** o **Guardar**. Los demás usuarios con acceso a Discursantes pueden consultar las referencias y abrir la fuente, conservando los permisos actuales de escritura.

El catálogo almacena título, autor, conferencia, etiquetas y URL; no copia los discursos completos. Se aceptan únicamente enlaces HTTPS de discursos individuales de Conferencia General en `churchofjesuschrist.org`, normalizados a español. Las etiquetas son clasificaciones locales y pueden ampliarse al añadir referencias.

## Avisos al asignar

El formulario muestra una alerta persistente cuando el discurso elegido ya aparece en el historial, indicando miembro y fecha de la asignación más reciente. Identifica referencias por su ID o enlace y reconoce títulos equivalentes de registros antiguos o de texto libre, ignorando mayúsculas, tildes y puntuación. Dos referencias distintas que solo comparten título no se consideran duplicadas.

También avisa cuando el miembro tiene una asignación fechada entre hoy y hace 30 días, incluidos ambos extremos y tanto registros pendientes como cumplidos. Usa días de calendario y la fecha actual de Argentina. Se excluye el propio registro al editar y no se cuentan fechas futuras en esta ventana. Los avisos son informativos: permiten continuar con la asignación y se actualizan al cambiar el miembro o discurso. Se basan en el historial cargado por la página; sin conexión, reflejan la copia disponible en el dispositivo.

## Búsqueda en línea

La opción **En línea** consulta el buscador oficial de Conferencia General en español. Se puede elegir un tema, escribir palabras clave o combinar ambos y pulsar **Buscar**. Los resultados incluyen título, autor cuando está disponible, conferencia y un fragmento breve, con **Leer** y **Seleccionar**. La paginación conserva la consulta enviada aunque se cambien los campos antes de realizar una nueva búsqueda.

Seleccionar importa la referencia al catálogo y completa el formulario de asignación; si ya existe el enlace, reutiliza la referencia guardada. Si el servicio no informa el autor, se abre una revisión para completarlo antes de seleccionar. La asignación del discursante requiere guardar el formulario como siempre. Los usuarios sin permisos de escritura pueden buscar y leer, pero no importar ni asignar.

El endpoint autenticado `GET /api/speakers/search-online?q=…&page=1` consulta la ruta pública que utiliza actualmente la web oficial: `/search/proxy/general-conference-search`. Es una integración dependiente del sitio, no una API pública con contrato de estabilidad. Si cambia o deja de responder, se muestra un error y permanece disponible el botón **Sitio oficial**, que abre la búsqueda directamente con el texto ingresado. No se extrae un catálogo masivo ni se usa inteligencia artificial.

El servidor limita a 20 solicitudes por minuto por cuenta, admite consultas de 2 a 180 caracteres y hasta 100 páginas, cancela consultas externas a los 10 segundos y almacena resultados en memoria durante 10 minutos. Filtra enlaces para admitir únicamente discursos individuales oficiales y convierte los fragmentos a texto; no entrega HTML externo a la interfaz. Las búsquedas no modifican la base de datos hasta que un administrador selecciona una referencia.

## Base de datos y despliegue

Ejecutar `npm run migrate` desde `server` antes de iniciar el backend actualizado. Se incluye `migrations/speech_references.sql`, idempotente, que crea el catálogo y la relación opcional con `speakers`. Los registros existentes conservan sus títulos y pueden seguir usando texto libre. Publicar también el cliente actualizado; Android necesita una nueva compilación para recibir estos cambios.

La migración carga tres referencias iniciales verificadas en sus páginas oficiales:

- [Se necesitan pacificadores — Russell M. Nelson, abril de 2023](https://www.churchofjesuschrist.org/study/general-conference/2023/04/47nelson?lang=spa).
- [¡Piensen de manera celestial! — Russell M. Nelson, octubre de 2023](https://www.churchofjesuschrist.org/study/general-conference/2023/10/51nelson?lang=spa).
- [El poder del ímpetu espiritual — Russell M. Nelson, abril de 2022](https://www.churchofjesuschrist.org/study/general-conference/2022/04/47nelson?lang=spa).

## Sin conexión

La consulta completa del catálogo usa la caché privada existente de la aplicación. Si se consultó previamente, se puede filtrar esa copia sin conexión. Abrir la fuente oficial requiere internet. Agregar referencias requiere conexión para evitar identificadores temporales al asignarlas. Las asignaciones mantienen el comportamiento de sincronización existente.
