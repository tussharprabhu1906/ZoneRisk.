require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const routes     = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

/* ── Rate limiting: 60 requests / 15 min per IP ── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' }
}));

/* ── API routes ── */
app.use('/api', routes);

/* ── Serve frontend for any non-API route ── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ── MongoDB connection ── */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 ZoneRisk running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running: mongod --dbpath /data/db');
    process.exit(1);
  });
