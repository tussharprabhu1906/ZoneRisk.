const mongoose = require('mongoose');

/* ── Analysis ── */
const analysisSchema = new mongoose.Schema({
  lat:      { type: Number, required: true },
  lon:      { type: Number, required: true },
  address:  { type: String, default: '' },
  pincode:  { type: String, default: '' },
  areaType: { type: String, default: 'urban' },
  temp:     Number,
  rain:     Number,
  aqi:      Number,
  elev:     Number,
  urban:    Number,
  score:    Number,
  category: String,
  aiSummary: String,
  aiRecommendations: [String],
  createdAt:{ type: Date, default: Date.now }
});

/* ── Feedback ── */
const feedbackSchema = new mongoose.Schema({
  analysisId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' },
  match:          { type: String, enum: ['yes', 'no'], required: true },
  previousWeight: Number,
  newWeight:      Number,
  createdAt:      { type: Date, default: Date.now }
});

/* ── Global AI Weights ── */
const weightSchema = new mongoose.Schema({
  key:   { type: String, default: 'global', unique: true },
  temp:  { type: Number, default: 0.2 },
  aqi:   { type: Number, default: 0.2 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = {
  Analysis: mongoose.model('Analysis', analysisSchema),
  Feedback: mongoose.model('Feedback', feedbackSchema),
  Weight:   mongoose.model('Weight',   weightSchema)
};
