const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const dbMod = require('../db/database');

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

// RF-01: Registro de usuario
router.post('/registro', (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const existente = dbMod.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existente) return res.status(409).json({ error: 'Ese correo ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const userId = dbMod.insert('INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?) RETURNING id', [nombre, email, hash]);

  const hogarId = dbMod.insert('INSERT INTO hogares (nombre, creado_por) VALUES (?, ?) RETURNING id', [`Hogar de ${nombre}`, userId]);
  dbMod.run('INSERT INTO hogar_miembros (hogar_id, usuario_id, rol) VALUES (?, ?, ?)', [hogarId, userId, 'admin']);

  req.session.userId = userId;
  req.session.hogarId = hogarId;
  res.json({ id: userId, nombre, email, hogarId });
});

// RF-01: Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = dbMod.get('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  const hogar = dbMod.get('SELECT hogar_id FROM hogar_miembros WHERE usuario_id = ?', [user.id]);
  req.session.userId = user.id;
  req.session.hogarId = hogar ? hogar.hogar_id : null;
  res.json({ id: user.id, nombre: user.nombre, email: user.email, hogarId: req.session.hogarId });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/yo', requireLogin, (req, res) => {
  const user = dbMod.get('SELECT id, nombre, email FROM usuarios WHERE id = ?', [req.session.userId]);
  res.json({ ...user, hogarId: req.session.hogarId });
});

module.exports = { router, requireLogin };
