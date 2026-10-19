const express  = require('express');
const axios    = require('axios');
const router   = express.Router();
const NodeCache = require('node-cache');
const { Analysis, Feedback, Weight } = require('./models');

const cache = new NodeCache({ stdTTL: 600 }); // 10-min cache
const API   = process.env.OPENWEATHER_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

/* ── helpers ── */
function riskCategory(score) {
  if (score < 4) return 'Low Risk';
  if (score < 7) return 'Moderate Risk';
  return 'High Risk';
}

async function getWeights() {
  let w = await Weight.findOne({ key: 'global' });
  if (!w) w = await Weight.create({ key: 'global' });
  return w;
}


/* ── AI risk summary & recommendations (Claude) ── */
async function getAISummary(d) {
  const fallback = {
    summary: `This ${d.areaType} area shows ${d.category.toLowerCase()} climate risk with a score of ${d.score}/10 based on current temperature and air quality conditions.`,
    recommendations: [
      'Monitor local weather alerts regularly.',
      'Ensure adequate ventilation in buildings.',
      'Limit outdoor activities during peak heat hours.',
      'Keep emergency supplies ready.',
      'Stay informed about air quality indexes.'
    ]
  };
  if (!ANTHROPIC_KEY || ANTHROPIC_KEY.startsWith('your_')) return fallback;
  const prompt = `You are a climate risk analyst. Given this ZoneRisk analysis, return ONLY valid JSON with keys "summary" (2-3 sentence plain-English risk summary) and "recommendations" (array of exactly 5 short actionable mitigation steps).

Data:
- Location: ${d.address || `${d.lat}, ${d.lon}`}
- Area type: ${d.areaType}
- Overall risk: ${d.category} (score ${d.score}/10)
- Temperature: ${d.temp}°C
- Cloud cover: ${d.rain}%
- AQI: ${d.aqi}
- High-risk zones: ${d.highCount}/25
- Moderate-risk zones: ${d.modCount}/25

Respond ONLY with JSON, no markdown.`;
  try {
    const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 20000
    });
    const parsed = JSON.parse(data.content[0].text.trim().replace(/```json|```/g, ''));
    if (!parsed.summary || !Array.isArray(parsed.recommendations)) return fallback;
    return parsed;
  } catch (e) {
    console.error('AI summary error:', e.message);
    return fallback;
  }
}

/* ════════════════════════════════════════
   POST /api/analyze
   Body: { lat, lon, address, pincode, areaType }
   Returns full climate + risk data
════════════════════════════════════════ */
router.post('/analyze', async (req, res) => {
  try {
    const { lat, lon, address = '', pincode = '', areaType = 'urban' } = req.body;

    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

    // Cache check (round to 3dp ≈ 111m grid)
    const cacheKey = `${(+lat).toFixed(3)}_${(+lon).toFixed(3)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    // Fetch weather from OpenWeatherMap
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API}&units=metric`;
    const { data: w } = await axios.get(weatherUrl);

    const temp  = w.main.temp;
    const rain  = w.clouds.all;
    const seed  = Math.abs(Math.sin(lat * 127.3) * Math.cos(lon * 311.7));
    const aqi   = Math.round(seed * 150);
    const elev  = Math.round(seed * 500);
    const urban = Math.round(seed * 100);

    // Use global shared weights
    const weights = await getWeights();
    const score   = Math.min(10, Math.max(0, Math.round(
      (temp * weights.temp + aqi * weights.aqi) / 10
    )));
    const category = riskCategory(score);

    // Build grid (25 cells) for the frontend
    const offs = [-0.02, -0.01, 0, 0.01, 0.02];
    const cells = [];
    const raws  = [];
    for (const i of offs) {
      for (const j of offs) {
        const la = +lat + i, lo = +lon + j;
        const s  = Math.abs(Math.sin(la * 127.3) * Math.cos(lo * 311.7));
        const t  = 28 + s * 10;
        raws.push(s * 10 + (t - 28) * 0.5);
        cells.push({ la, lo, seed: s, t });
      }
    }
    const min = Math.min(...raws), max = Math.max(...raws);
    const grid = cells.map((c, k) => {
      const norm  = max === min ? 5 : ((raws[k] - min) / (max - min)) * 10;
      const color = norm > 6.5 ? '#ff4a4a' : norm > 3.5 ? '#ffb74d' : '#00e5a0';
      return { la: c.la, lo: c.lo, t: c.t, norm, color };
    });

    const highCount = grid.filter(c => c.norm > 6.5).length;
    const modCount  = grid.filter(c => c.norm > 3.5 && c.norm <= 6.5).length;
    const ai = await getAISummary({ address, lat, lon, areaType, category, score, temp, rain, aqi, highCount, modCount });

    // Save to MongoDB
    const analysis = await Analysis.create({
      lat, lon, address, pincode, areaType,
      temp, rain, aqi, elev, urban, score, category,
      aiSummary: ai.summary, aiRecommendations: ai.recommendations
    });

    const result = {
      id: analysis._id,
      temp, rain, aqi, elev, urban, score, category,
      weights: { temp: weights.temp, aqi: weights.aqi },
      aiSummary: ai.summary,
      aiRecommendations: ai.recommendations,
      grid
    };

    cache.set(cacheKey, result);
    res.json(result);

  } catch (err) {
    console.error('analyze error:', err.message);
    res.status(500).json({ error: 'Failed to fetch climate data' });
  }
});

/* ════════════════════════════════════════
   POST /api/geocode
   Body: { pincode } or { address }
   Returns { lat, lon }
════════════════════════════════════════ */
router.post('/geocode', async (req, res) => {
  try {
    const { pincode, address } = req.body;
    let lat, lon;

    if (address) {
      const { data } = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&appid=${API}`
      );
      if (!data.length) return res.status(404).json({ error: 'Address not found' });
      lat = data[0].lat; lon = data[0].lon;
    } else if (pincode) {
      const { data } = await axios.get(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${pincode},IN&appid=${API}`
      );
      if (!data.lat) return res.status(404).json({ error: 'Pincode not found' });
      lat = data.lat; lon = data.lon;
    } else {
      return res.status(400).json({ error: 'pincode or address required' });
    }

    res.json({ lat, lon });
  } catch (err) {
    console.error('geocode error:', err.message);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

/* ════════════════════════════════════════
   POST /api/feedback
   Body: { analysisId, match }
   Updates global shared AI weights
════════════════════════════════════════ */
router.post('/feedback', async (req, res) => {
  try {
    const { analysisId, match } = req.body;
    if (!match) return res.status(400).json({ error: 'match required' });

    const weights = await getWeights();
    const prev = weights.temp;

    if (match === 'no')  weights.temp = +(weights.temp * 0.98).toFixed(6);
    if (match === 'yes') weights.temp = +(weights.temp * 1.01).toFixed(6);
    weights.updatedAt = new Date();
    await weights.save();

    await Feedback.create({
      analysisId: analysisId || null,
      match,
      previousWeight: prev,
      newWeight: weights.temp
    });

    res.json({ success: true, weights: { temp: weights.temp, aqi: weights.aqi } });
  } catch (err) {
    console.error('feedback error:', err.message);
    res.status(500).json({ error: 'Feedback save failed' });
  }
});

/* ════════════════════════════════════════
   GET /api/history?limit=10
   Returns recent analyses
════════════════════════════════════════ */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const history = await Analysis
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('address pincode areaType score category temp aqi createdAt lat lon');
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'History fetch failed' });
  }
});

/* ════════════════════════════════════════
   GET /api/leaderboard
   Top 10 highest-risk zones ever searched
════════════════════════════════════════ */
router.get('/leaderboard', async (req, res) => {
  try {
    const top = await Analysis
      .find()
      .sort({ score: -1 })
      .limit(10)
      .select('address pincode areaType score category temp aqi createdAt');
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: 'Leaderboard fetch failed' });
  }
});

/* ════════════════════════════════════════
   GET /api/stats
   Overall system statistics
════════════════════════════════════════ */
router.get('/stats', async (req, res) => {
  try {
    const [total, weights, riskCounts] = await Promise.all([
      Analysis.countDocuments(),
      getWeights(),
      Analysis.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const avgScore = await Analysis.aggregate([
      { $group: { _id: null, avg: { $avg: '$score' } } }
    ]);

    res.json({
      totalAnalyses: total,
      averageScore:  avgScore[0]?.avg?.toFixed(2) || 0,
      riskBreakdown: riskCounts,
      currentWeights: { temp: weights.temp, aqi: weights.aqi }
    });
  } catch (err) {
    res.status(500).json({ error: 'Stats fetch failed' });
  }
});

// ════════════════════════════════════════
// DELETE /api/clear-history
// Clears all analysis history
// ════════════════════════════════════════
router.delete('/clear-history', async (req, res) => {
  try {
    await Analysis.deleteMany({});
    res.json({ message: "History cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

module.exports = router;
