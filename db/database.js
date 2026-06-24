const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pagaya.sqlite');
let SQL = null;
let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hogares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  creado_por INTEGER NOT NULL,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS hogar_miembros (
  hogar_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  rol TEXT DEFAULT 'miembro',
  unido_en TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (hogar_id, usuario_id),
  FOREIGN KEY (hogar_id) REFERENCES hogares(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  url_pago TEXT
);

CREATE TABLE IF NOT EXISTS facturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hogar_id INTEGER NOT NULL,
  servicio_id INTEGER,
  registrado_por INTEGER NOT NULL,
  nombre_servicio TEXT NOT NULL,
  empresa TEXT,
  valor_estimado REAL NOT NULL,
  fecha_vencimiento TEXT NOT NULL,
  referencia_pago TEXT,
  estado TEXT DEFAULT 'pendiente',
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hogar_id) REFERENCES hogares(id),
  FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL,
  registrado_por INTEGER NOT NULL,
  valor_pagado REAL NOT NULL,
  fecha_pago TEXT DEFAULT CURRENT_TIMESTAMP,
  metodo TEXT DEFAULT 'manual',
  FOREIGN KEY (factura_id) REFERENCES facturas(id),
  FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS alertas_config (
  usuario_id INTEGER PRIMARY KEY,
  alerta_3_dias INTEGER DEFAULT 1,
  alerta_1_dia INTEGER DEFAULT 1,
  alerta_vencimiento INTEGER DEFAULT 1,
  notificar_correo INTEGER DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS alertas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  programada_en TEXT NOT NULL,
  enviada INTEGER DEFAULT 0,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factura_id) REFERENCES facturas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
`;

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDB() {
  if (db) return db;
  SQL = await initSqlJs({});
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run(SCHEMA);
  persist();
  return db;
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  persist();
}

function insert(sql, params = []) {
  // sql debe terminar en "RETURNING id"
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  persist();
  return row.id;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) result = stmt.getAsObject();
  stmt.free();
  return result;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

module.exports = { initDB, run, insert, get, all };
