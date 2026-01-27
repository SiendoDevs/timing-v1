# Guía de Despliegue en Producción (VPS)

En producción, no accedemos por `localhost:3001`. Usamos dominios reales (ej. `empresa1.com`, `empresa2.com`) y un servidor "Proxy" (Nginx) que dirige el tráfico.

## 1. Preparación del Servidor (VPS)
Necesitas un servidor Ubuntu/Debian con Docker instalado.

## 2. Configurar Dominios
En tu proveedor de dominios (GoDaddy, Namecheap), apunta los registros DNS:
- `cliente-a.com` -> IP de tu servidor
- `cliente-b.com` -> IP de tu servidor

## 3. Configurar Nginx
Edita el archivo `nginx.conf` en este proyecto:
- Cambia `server_name cliente-a.com;` por el dominio real de tu primer cliente.
- Cambia `server_name cliente-b.com;` por el dominio real de tu segundo cliente.

## 4. Desplegar
Ejecuta el modo producción:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## Diferencias con MVP (Local)
1. **Nginx:** Se agrega un contenedor Nginx que escucha en el puerto 80 (Internet).
2. **Puertos Ocultos:** Las Apps (Cliente A/B) ya no exponen puertos al exterior, solo hablan con Nginx internamente.
3. **WebSockets:** La configuración de Nginx incluye soporte para WebSockets (`Upgrade $http_upgrade`), vital para que los tiempos se actualicen en vivo.