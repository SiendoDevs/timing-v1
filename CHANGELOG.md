# Changelog

Todas las variaciones notables de este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.2.4] - 2026-01-27
### Añadido
- **Banderas Especiales:** Implementación completa de "Bandera de Reparación" (círculo naranja/negro) y "Sanción" (bandera negra/blanca) con controles de entrada para número y tiempo.
- **Track Overlay:** Nuevo icono `MapPin` de Lucide para la ubicación del circuito.

### Cambiado
- **LiveTiming:**
  - Paginación de pilotos reducida a 10 por página.
  - Mejora visual en banner de sanciones (sin borde grueso, icono personalizado).
  - Lógica de bandera verde ajustada para no interrumpir al desactivar banderas especiales.
- **Dashboard:**
  - Rediseño compacto de controles de banderas.
  - Borde de acento añadido al botón "Biblioteca".
  - Ajuste de peso visual en el número de versión (más fino).
- **Resultados:** Layout de filas ajustado con anchos fijos para posición/número y salto de línea en nombres largos.

## [1.2.3] - 2026-01-27
### Añadido
- **Animaciones:** Integración de `framer-motion` en `LiveTiming` para transiciones suaves al reordenar posiciones en la tabla.
- **UX:** Persistencia de 8 segundos para las flechas de cambio de posición (▲/▼), permitiendo visualizar mejor los adelantamientos incluso con actualizaciones lentas.

### Corregido
- **Récord de Vuelta:** Desacoplada la lógica del botón "Récord de Vuelta". Ahora solo alterna la tarjeta emergente, mientras que el resaltado en tabla (fila morada + icono) permanece siempre visible para el piloto más rápido.

## [1.2.2] - 2026-01-27
### Añadido
- **Subida de Imágenes:** Soporte completo para subir mapas de circuitos (PNG, max 1MB) directamente a Cloudinary desde el Dashboard.
- **Previsualización:** Nueva vista previa de imagen en la sección de "Mapa del Circuito" y en la lista de la "Biblioteca".

### Corregido
- **Cloudinary Upload:** Solucionado problema con respuestas "pending" o URLs faltantes implementando subida vía `upload_stream` sincrónico.
- **UI:** Mejorado el estilo de las previsualizaciones de imagen para que no ocupen espacio excesivo (max-height limitado y ajuste `object-contain`).
- **Redis:** Implementada sanitización automática de la variable `REDIS_URL` para prevenir errores si se pega accidentalmente el comando CLI completo.

## [1.2.1] - 2026-01-26
### Corregido
- **Circuit Info:** Solucionado problema donde la información del circuito se quedaba cargando infinitamente si la conexión con Redis fallaba o no estaba disponible. Ahora retorna un estado vacío o valores por defecto para evitar bloqueos en la UI.

## [1.2.0] - 2026-01-26
### Añadido
- **Biblioteca de Circuitos:** Nueva funcionalidad para guardar, cargar y eliminar configuraciones de circuitos (nombre, mapa, récords, etc.) con persistencia en Redis.
- **Acceso Rápido:** Botón "Abrir Overlay" en la sección de Info del Circuito para abrir `/track` en una nueva pestaña.
- **UI Dashboard:** Integración completa de iconos **Lucide React** (Radio, Tv, Flag, Award, User, ListChecks, etc.) reemplazando todos los emojis para una apariencia profesional y consistente.

### Cambiado
- **Interfaz de Usuario:** Rediseño de botones de acción, modales y tablas en el Dashboard para usar iconos vectoriales.
- **Selección de Pilotos:** Reemplazo de marcas de verificación de texto por iconos `<Check />` en la tabla de candidatos.
- **Backend:** Nuevos endpoints `/api/circuits` para soporte CRUD de la biblioteca.

## [1.1.0] - 2026-01-26
### Añadido
- **Gestión de Usuarios:** Nuevo sistema multi-usuario con persistencia en archivo local (`users.json`).
- **Dashboard UI:** Nueva interfaz para crear, visualizar y eliminar usuarios desde el panel de administración.
- **Autenticación:** Soporte completo para login con usuario y contraseña.

### Seguridad
- **Protección de Datos:** Exclusión de `users.json` en el repositorio para proteger credenciales.
- **Compatibilidad:** Mantenido soporte para login antiguo (solo contraseña) para evitar bloqueos en actualizaciones.

## [1.1.0] - 2026-01-26
### Añadido
- **Gestión de Usuarios:** Sistema completo para crear, listar y eliminar usuarios sin tocar el código del servidor.
- **Persistencia:** Almacenamiento local de usuarios en `users.json`.
- **Interfaz:** Nueva sección de gestión de usuarios en el Dashboard.
- **Seguridad:** Soporte para múltiples usuarios con autenticación completa (usuario + contraseña).

### Cambiado
- **Identidad:** Renombrado del proyecto a **StreamRace Overlay**.
- **Login:** Actualizado formulario de acceso para requerir usuario y contraseña.

## [1.0.1] - 2026-01-26
### Corregido
- Actualizada dependencia `puppeteer` a la última versión para resolver advertencia de deprecación (< 24.15.0).

## [1.0.0] - 2026-01-26
### Añadido
- **Traducción Automática:** Implementación de hook `useAutoTranslation` para traducir anuncios de carrera (Inglés -> Español) en tiempo real usando API externa.
- **Sistema de Votación:** Nueva barra de herramientas para selección rápida de candidatos (Top 3, Top 5, Top 10, Todos, Limpiar).
- **Overlays:** Títulos de sección y redirección correcta en el botón "Timing".
- **Configuración:** Opción `publicUrl` para códigos QR personalizados.

### Cambiado
- **Interfaz:** Unificación de estilos entre el bloque de Vueltas y Anuncios (altura, fuente, padding).
- **Rendimiento:** Optimización del bucle de datos en `LiveTiming` (eliminado localStorage bloqueante, uso de `setTimeout` recursivo).
- **Limpieza:** Reseteo automático de candidatos seleccionados al finalizar votación sin votos.
- **Lógica:** Reseteo de contador de vueltas al cambiar de sesión.

### Eliminado
- Referencias visuales a URLs activas en el Dashboard.
- Archivos de configuración manual de i18n en favor de la traducción automática.
