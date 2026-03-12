# Release Checklist

## Smoke tests en dispositivos fisicos

- Editar una transaccion historica en USD y confirmar que no cambia el balance.
- Editar una transaccion historica en VES con tasa manual y confirmar que conserva `originalRate` y `amountUSD`.
- Editar una transaccion historica en EUR y confirmar que conserva la conversion historica.
- Crear, editar y eliminar movimientos desde Android e iPhone.
- Abrir la tab `+` y confirmar que redirige al modal de movimientos.

## Presupuestos y metas

- Configurar `displayCurrency = USD` y crear presupuestos/metas.
- Cambiar a `displayCurrency = EUR`, editar esos mismos valores y confirmar que se guardan correctamente.
- Copiar presupuestos del periodo anterior y confirmar que el backup no desaparece si la operacion falla.
- Renombrar una categoria con presupuesto o meta activa y confirmar que transacciones, presupuesto y meta migran juntos.

## Auth, onboarding y sesiones

- Login con email/password.
- Login con Google en Android.
- Validar si Google Sign-In debe seguir oculto en iOS antes de publicar.
- Completar onboarding desde una cuenta nueva.
- Arrancar la app sin red y confirmar que no aparece un estado vacio como si no existieran datos.
- Simular sesion expirada y confirmar que la app vuelve a auth o muestra error claro.

## Workspaces y datos

- Crear workspace, cambiar workspace y eliminar workspace secundario.
- Confirmar que el workspace activo persiste al reiniciar la app.
- Verificar que cada workspace muestra sus propios movimientos, presupuestos y metas.

## Integraciones y configuracion externa

- Confirmar redirects OAuth de produccion para Supabase.
- Confirmar politicas RLS en la base productiva.
- Verificar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` de release.
- Confirmar que crash reporting y analytics esten activos si forman parte del release.
- Verificar permisos de notificaciones y recordatorio diario en Android e iOS.

## Stores

- Revisar icono, splash, nombre, version y build number.
- Revisar textos de privacidad, data safety y permisos declarados.
- Validar capturas, descripcion corta/larga y categoria final en App Store / Play Store.
