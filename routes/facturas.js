const express = require('express');
const router = express.Router();
const dbMod = require('../db/database');
const { requireLogin } = require('./auth');
const { generarAlertasParaFactura } = require('./config');

function calcularEstado(fechaVencimiento, estadoActual) {
  if (estadoActual === 'pagada') return 'pagada';
  const hoy = new Date().toISOString().slice(0, 10);
  return fechaVencimiento < hoy ? 'vencida' : 'pendiente';
}

// RF-02: Registro de facturas
router.post('/', requireLogin, (req, res) => {
  const { nombre_servicio, empresa, valor_estimado, fecha_vencimiento, referencia_pago } = req.body;
  if (!nombre_servicio || !valor_estimado || !fecha_vencimiento) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const id = dbMod.insert(
    `INSERT INTO facturas (hogar_id, registrado_por, nombre_servicio, empresa, valor_estimado, fecha_vencimiento, referencia_pago, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente') RETURNING id`,
    [req.session.hogarId, req.session.userId, nombre_servicio, empresa || '', valor_estimado, fecha_vencimiento, referencia_pago || '']
  );
  const factura = dbMod.get('SELECT * FROM facturas WHERE id = ?', [id]);
  generarAlertasParaFactura(factura, req.session.userId);
  res.status(201).json(factura);
});

// RF-03 + RF-10: Listado / panel resumen
router.get('/', requireLogin, (req, res) => {
  const facturas = dbMod.all('SELECT * FROM facturas WHERE hogar_id = ? ORDER BY fecha_vencimiento ASC', [req.session.hogarId]);
  const actualizadas = facturas.map(f => ({ ...f, estado: calcularEstado(f.fecha_vencimiento, f.estado) }));

  const resumen = {
    total: actualizadas.reduce((s, f) => s + f.valor_estimado, 0),
    pendientes: actualizadas.filter(f => f.estado === 'pendiente').length,
    vencidas: actualizadas.filter(f => f.estado === 'vencida').length,
    pagadas: actualizadas.filter(f => f.estado === 'pagada').length,
  };
  res.json({ facturas: actualizadas, resumen });
});

router.get('/:id', requireLogin, (req, res) => {
  const f = dbMod.get('SELECT * FROM facturas WHERE id = ? AND hogar_id = ?', [req.params.id, req.session.hogarId]);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json({ ...f, estado: calcularEstado(f.fecha_vencimiento, f.estado) });
});

// RF-09: Edición
router.put('/:id', requireLogin, (req, res) => {
  const { nombre_servicio, empresa, valor_estimado, fecha_vencimiento, referencia_pago } = req.body;
  const f = dbMod.get('SELECT * FROM facturas WHERE id = ? AND hogar_id = ?', [req.params.id, req.session.hogarId]);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });

  dbMod.run(
    `UPDATE facturas SET nombre_servicio=?, empresa=?, valor_estimado=?, fecha_vencimiento=?, referencia_pago=?, actualizado_en=CURRENT_TIMESTAMP WHERE id=?`,
    [nombre_servicio || f.nombre_servicio, empresa || f.empresa, valor_estimado || f.valor_estimado, fecha_vencimiento || f.fecha_vencimiento, referencia_pago || f.referencia_pago, req.params.id]
  );
  res.json(dbMod.get('SELECT * FROM facturas WHERE id = ?', [req.params.id]));
});

// RF-06: Marcar como pagada
router.post('/:id/pagar', requireLogin, (req, res) => {
  const { valor_pagado, metodo } = req.body;
  const f = dbMod.get('SELECT * FROM facturas WHERE id = ? AND hogar_id = ?', [req.params.id, req.session.hogarId]);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });

  dbMod.run(`UPDATE facturas SET estado='pagada', actualizado_en=CURRENT_TIMESTAMP WHERE id=?`, [req.params.id]);
  dbMod.run(
    `INSERT INTO pagos (factura_id, registrado_por, valor_pagado, metodo) VALUES (?, ?, ?, ?)`,
    [req.params.id, req.session.userId, valor_pagado || f.valor_estimado, metodo || 'manual']
  );
  res.json({ ok: true, factura: dbMod.get('SELECT * FROM facturas WHERE id = ?', [req.params.id]) });
});

// RF-09: Eliminación
router.delete('/:id', requireLogin, (req, res) => {
  const f = dbMod.get('SELECT * FROM facturas WHERE id = ? AND hogar_id = ?', [req.params.id, req.session.hogarId]);
  if (!f) return res.status(404).json({ error: 'Factura no encontrada' });
  dbMod.run('DELETE FROM facturas WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// RF-07: Historial de pagos
router.get('/historial/pagos', requireLogin, (req, res) => {
  const pagos = dbMod.all(
    `SELECT p.*, f.nombre_servicio, f.empresa FROM pagos p
     JOIN facturas f ON f.id = p.factura_id
     WHERE f.hogar_id = ? ORDER BY p.fecha_pago DESC`,
    [req.session.hogarId]
  );
  res.json(pagos);
});

module.exports = router;
