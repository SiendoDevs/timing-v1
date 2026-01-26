# Changelog

Todas las variaciones notables de este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
