# Autocompletado de inicio de sesión en Android

El login usa campos estables con `autocomplete="username"` y `autocomplete="current-password"`, formulario habilitado para autocompletado, teclado de correo y sin corrección automática ni mayúsculas automáticas. Los valores se leen directamente del formulario para admitir gestores que rellenan los campos sin emitir eventos de React.

Durante la petición de acceso, los campos quedan en solo lectura en lugar de deshabilitados. Tras recibir un token válido y antes de abandonar el login, el complemento nativo `AndroidAutofill` confirma la sesión de autocompletado mediante `AutofillManager.commit()`. Android puede ofrecer guardar las credenciales en el proveedor elegido por el usuario. El complemento no recibe contraseñas ni las almacena; utiliza el contexto que mantiene Android para la WebView. La WebView está marcada como importante para autocompletado desde `MainActivity`.

La disponibilidad de sugerencias y del diálogo de guardado depende del servicio configurado en Android, las credenciales guardadas y la versión de Android System WebView. No se obliga al usuario a habilitar un proveedor ni se garantiza que muestre un aviso en cada inicio de sesión. Esta integración no configura la asociación de credenciales entre el dominio web y la app mediante Digital Asset Links.

Para incluir el complemento en una instalación nativa nueva, ejecutar `npm run android:sync` desde `client` y compilar la app. Las instalaciones antiguas siguen iniciando sesión aunque todavía no tengan el complemento. Publicar la web no actualiza el código nativo instalado.

Referencia: [Autocompletado de WebView — Android Developers](https://developer.android.com/reference/android/webkit/WebView).
