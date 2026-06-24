# PagaYa — Backend funcional (Fase 3)

Aplicación de gestión de pagos del hogar. Backend en Node.js + Express + SQLite (via sql.js, sin compilación nativa).

## Instalación local

```bash
npm install
cp .env.example .env
npm start
```

Abre http://localhost:3000

## Estructura

- `server.js` — punto de entrada
- `db/database.js` — conexión y esquema SQLite
- `routes/auth.js` — registro, login, logout (RF-01)
- `routes/facturas.js` — CRUD de facturas, pagos, historial (RF-02, RF-03, RF-06, RF-07, RF-09)
- `routes/config.js` — configuración de alertas (RF-04) y generación automática al crear factura
- `routes/hogar.js` — hogar compartido, invitar miembros (RF-08)
- `public/` — frontend (HTML, CSS, JS vanilla) con los 4 módulos: Inicio, Facturas, Historial, Configuración

## Despliegue gratuito en Render

1. Sube este proyecto a un repositorio de GitHub
2. Crea cuenta en https://render.com (gratis, login con GitHub)
3. New + → Web Service → conecta tu repositorio
4. Build command: `npm install`
5. Start command: `npm start`
6. Agrega variable de entorno SESSION_SECRET con un valor aleatorio
7. Deploy — Render te da una URL pública tipo `https://pagaya-xxxx.onrender.com`

Nota: el plan gratuito "duerme" tras 15 min sin tráfico; la primera petición tras dormir tarda unos segundos en responder.

## Base de datos

SQLite persiste en `db/pagaya.sqlite` como archivo. En Render, si no configuras un disco persistente, el archivo se reinicia en cada deploy — para una entrega académica esto es aceptable, pero si necesitas persistencia real entre despliegues, usa un "Persistent Disk" gratuito de Render montado en `/db`.
