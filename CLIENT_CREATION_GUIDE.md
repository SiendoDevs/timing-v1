# Guía: Cómo Crear un Nuevo Cliente

Esta guía explica paso a paso cómo agregar un nuevo cliente (ej. Cliente C) a tu infraestructura Docker.

## 1. Editar el archivo de composición
Abre `docker-compose.mvp.yml` (para local) o `docker-compose.prod.yml` (para producción).

### Paso A: Copiar y Pegar Servicios
Copia el bloque de un cliente existente (Redis + App) y pégalo al final de la sección `services:`.

Modifica los nombres y puertos. Ejemplo para **Cliente C**:

```yaml
  # --- Cliente C (Puerto 3003) ---
  client-c-redis:
    image: redis:alpine
    container_name: client-c-redis
    volumes:
      - client_c_redis_data:/data
    restart: always

  client-c-app:
    build: .
    container_name: client-c-app
    ports:
      - "3003:3000"  # <--- CAMBIAR PUERTO AQUÍ (3003)
    environment:
      - PORT=3000
      - DATA_DIR=data
      - REDIS_URL=redis://client-c-redis:6379  # <--- APUNTAR A SU REDIS
      - NODE_ENV=production
    volumes:
      - client_c_data:/usr/src/app/data
    depends_on:
      - client-c-redis
    restart: always
```

### Paso B: Registrar Volúmenes
Al final del archivo, en la sección `volumes:`, agrega los volúmenes para el nuevo cliente:

```yaml
volumes:
  # ... anteriores ...
  client_c_redis_data:
  client_c_data:
```

## 2. Aplicar los Cambios
Guarda el archivo y ejecuta el siguiente comando en la terminal para encender el nuevo cliente:

```bash
# Para entorno Local
docker-compose -f docker-compose.mvp.yml up -d

# Para Producción
docker-compose -f docker-compose.prod.yml up -d
```

Docker detectará que hay un nuevo servicio y solo creará los contenedores nuevos (no reiniciará los otros si no es necesario).

## 3. (Solo Producción) Configurar Dominio
Si estás en producción con Nginx:
1. Abre `nginx.conf`.
2. Agrega un nuevo bloque `server { ... }` para `cliente-c.com`.
3. Apunta el `proxy_pass` a `http://client-c-app:3000`.
4. Recarga Nginx: `docker-compose -f docker-compose.prod.yml restart nginx`
