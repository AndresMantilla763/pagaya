const express = require('express');
const router = express.Router();
const dbMod = require('../db/database');
const { requireLogin } = require('./auth');

function defaultConfig(usuarioId) {
  dbMod.run(
    `INSERT INTO alertas_config (usuario_id, alerta_3_dias, alerta_1_dia, alerta_vencimiento, notificar_correo)
     VALUES (?, 1, 1, 1, 0)`,
    [usuarioId]
  );
  return dbMod.get('SELECT * FROM alertas_config WHERE usuario_id = ?', [usuarioId]);
}

// Obtener configuración de alertas del usuario (RF-04)
router.get('/', requireLogin, (req, res) => {
  let config = dbMod.get('SELECT * FROM alertas_config WHERE usuario_id = ?', [req.session.userId]);
  if (!config) config = defaultConfig(req.session.userId);
  res.json(config);
});

// Actualizar configuración de alertas (toggles del módulo Configuración)
router.put('/', requireLogin, (req, res) => {
  const { alerta_3_dias, alerta_1_dia, alerta_vencimiento, notificar_correo } = req.body;
  let config = dbMod.get('SELECT * FROM alertas_config WHERE usuario_id = ?', [req.session.userId]);
  if (!config) config = defaultConfig(req.session.userId);

  dbMod.run(
    `UPDATE alertas_config SET alerta_3_dias=?, alerta_1_dia=?, alerta_vencimiento=?, notificar_correo=? WHERE usuario_id=?`,
    [
      alerta_3_dias !== undefined ? (alerta_3_dias ? 1 : 0) : config.alerta_3_dias,
      alerta_1_dia !== undefined ? (alerta_1_dia ? 1 : 0) : config.alerta_1_dia,
      alerta_vencimiento !== undefined ? (alerta_vencimiento ? 1 : 0) : config.alerta_vencimiento,
      notificar_correo !== undefined ? (notificar_correo ? 1 : 0) : config.notificar_correo,
      req.session.userId
    ]
  );
  res.json(dbMod.get('SELECT * FROM alertas_config WHERE usuario_id = ?', [req.session.userId]));
});

// Generar alertas pendientes para una factura (llamado internamente al crear/editar factura)
function generarAlertasParaFactura(factura, usuarioId) {
  const config = dbMod.get('SELECT * FROM alertas_config WHERE usuario_id = ?', [usuarioId]) || defaultConfig(usuarioId);
  const fechaVenc = new Date(factura.fecha_vencimiento + 'T08:00:00');

  dbMod.run('DELETE FROM alertas WHERE factura_id = ? AND enviada = 0', [factura.id]);

  const tipos = [];
  if (config.alerta_3_dias) tipos.push({ tipo: '3_dias', dias: 3 });
  if (config.alerta_1_dia) tipos.push({ tipo: '1_dia', dias: 1 });
  if (config.alerta_vencimiento) tipos.push({ tipo: 'vencimiento', dias: 0 });

  tipos.forEach(({ tipo, dias }) => {
    const programada = new Date(fechaVenc);
    programada.setDate(programada.getDate() - dias);
    dbMod.run(
      'INSERT INTO alertas (factura_id, usuario_id, tipo, programada_en) VALUES (?, ?, ?, ?)',
      [factura.id, usuarioId, tipo, programada.toISOString()]
    );
  });
}

// Listar alertas pendientes del usuario (para mostrar campanita / badge)
router.get('/pendientes', requireLogin, (req, res) => {
  const ahora = new Date().toISOString();
  const alertas = dbMod.all(
    `SELECT a.*, f.nombre_servicio, f.valor_estimado, f.fecha_vencimiento FROM alertas a
     JOIN facturas f ON f.id = a.factura_id
     WHERE a.usuario_id = ? AND a.enviada = 0 AND a.programada_en <= ?
     ORDER BY a.programada_en ASC`,
    [req.session.userId, ahora]
  );
  res.json(alertas);
});

module.exports = { router, generarAlertasParaFactura };
