# StreamRace Overlay MVP

## Requisitos Previos
- **Docker Desktop** para Windows (incluye Docker Compose).
  - Descargar: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
  - Asegúrate de que esté ejecutándose (busca el icono de la ballena en la barra de tareas).

## Cómo Iniciar (Modo Multi-Cliente)

1.  **Construir y Levantar Servicios:**
    Abrir una terminal en la carpeta del proyecto y ejecutar:
    ```bash
    docker-compose -f docker-compose.mvp.yml up --build -d
    ```

2.  **Acceder a los Clientes:**
    - **Cliente A:** [http://localhost:3001](http://localhost:3001)
    - **Cliente B:** [http://localhost:3002](http://localhost:3002)

3.  **Administrar Contenedores:**
    - Ver estado: `docker-compose -f docker-compose.mvp.yml ps`
    - Detener todo: `docker-compose -f docker-compose.mvp.yml down`
    - Ver logs: `docker-compose -f docker-compose.mvp.yml logs -f`

## Notas
- Cada cliente tiene su propia base de datos (Redis) y archivos (uploads/users) aislados.
- Para agregar un nuevo cliente, copia la configuración en `docker-compose.mvp.yml` y cambia el puerto (ej. 3003).