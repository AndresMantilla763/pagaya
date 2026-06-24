const express = require('express');
const router = express.Router();
const dbMod = require('../db/database');
const { requireLogin } = require('./auth');

// Info del hogar actual + miembros
router.get('/', requireLogin, (req, res) => {
  const hogar = dbMod.get('SELECT * FROM hogares WHERE id = ?', [req.session.hogarId]);
  if (!hogar) return res.status(404).json({ error: 'Hogar no encontrado' });

  const miembros = dbMod.all(
    `SELECT u.id, u.nombre, u.email, hm.rol FROM hogar_miembros hm
     JOIN usuarios u ON u.id = hm.usuario_id
     WHERE hm.hogar_id = ?`,
    [req.session.hogarId]
  );
  res.json({ ...hogar, miembros });
});

// RF-08: Invitar miembro por correo (debe existir como usuario registrado)
router.post('/invitar', requireLogin, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Indica el correo a invitar' });

  const usuario = dbMod.get('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!usuario) return res.status(404).json({ error: 'No existe un usuario registrado con ese correo' });

  const yaMiembro = dbMod.get(
    'SELECT * FROM hogar_miembros WHERE hogar_id = ? AND usuario_id = ?',
    [req.session.hogarId, usuario.id]
  );
  if (yaMiembro) return res.status(409).json({ error: 'Ese usuario ya pertenece a este hogar' });

  dbMod.run(
    'INSERT INTO hogar_miembros (hogar_id, usuario_id, rol) VALUES (?, ?, ?)',
    [req.session.hogarId, usuario.id, 'miembro']
  );
  res.json({ ok: true, nombre: usuario.nombre, email: usuario.email });
});

// Renombrar hogar
router.put('/', requireLogin, (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Indica el nuevo nombre del hogar' });
  dbMod.run('UPDATE hogares SET nombre = ? WHERE id = ?', [nombre, req.session.hogarId]);
  res.json({ ok: true, nombre });
});

module.exports = router;
