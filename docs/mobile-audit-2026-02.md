# Auditoría móvil profunda (iPhone / iPad / Android)

Fecha: 2026-02-27

## Alcance

Se auditó la capa de UI de autenticación, navegación principal por tabs y sheets/modales de captura de transacciones, con foco en:

- consistencia visual cross-platform,
- adaptación para pantallas grandes (iPad/tablets Android),
- robustez de layout ante rotación/cambios de tamaño,
- mantenibilidad de estilos.

## Hallazgos clave

### 1) Tipografía inconsistente en login

- `welcomeTitle` usaba la familia `Alexandria`, que no está cargada en `_layout.tsx`.
- Impacto: fallback de fuente no determinístico entre plataformas.

**Acción aplicada**: Se cambió a `Outfit_700Bold` para alinearlo con la carga real de fuentes.

### 2) Pantalla de login sin contenedor responsivo en iPad/tablets

- El formulario ocupaba ancho completo con padding fijo horizontal.
- Impacto: en pantallas grandes el formulario pierde jerarquía visual y legibilidad.

**Acción aplicada**: Se añadió un `formShell` con `maxWidth` condicional en anchos >= 768 y centrado horizontal.

### 3) Barra de tabs sin límite máximo de ancho

- La tab bar se dimensionaba por margen proporcional al ancho de pantalla.
- Impacto: en iPad/tablets se vuelve excesivamente ancha, empeorando ergonomía.

**Acción aplicada**: Se limitó el ancho con `Math.min(screenWidth * 0.88, 540)` y centrado.

### 4) Bottom sheet con altura calculada de forma estática

- Se usaba `Dimensions.get("window")` dentro de `StyleSheet.create` global.
- Impacto: puede no reaccionar correctamente a rotación/cambios de tamaño dinámico.

**Acción aplicada**: Se migró a `useWindowDimensions` + estilos memoizados por tamaño; además se mejora experiencia en tablet con ancho máximo y bordes inferiores redondeados.

## Riesgos residuales / mejoras sugeridas (siguiente iteración)

1. Añadir pruebas E2E básicas de flujo auth + crear transacción (idealmente Detox o Maestro).
2. Introducir snapshots visuales para iPhone SE, iPhone Pro Max, iPad y Android tablet.
3. Revisar accesibilidad semántica (`accessibilityLabel`, `accessibilityRole`) en botones de iconos.
4. Definir tokens de spacing por breakpoint para evitar valores mágicos de layout.

## Verificaciones ejecutadas

- `npx tsc --noEmit`
- `npm run lint`

Ambas ejecutaron sin errores de compilación/lint en el entorno local.
