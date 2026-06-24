require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const dbMod = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'pagaya_clave_temporal_cambiar_en_produccion',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 días
}));

dbMod.initDB().then(() => {
  const { router: authRouter } = require('./routes/auth');
  const facturasRouter = require('./routes/facturas');
  const hogarRouter = require('./routes/hogar');
  const { router: configRouter } = require('./routes/config');

  app.use('/api/auth', authRouter);
  app.use('/api/facturas', facturasRouter);
  app.use('/api/hogar', hogarRouter);
  app.use('/api/config', configRouter);

  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.listen(PORT, () => {
    console.log(`PagaYa corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});
