const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// In-memory junctions
let junctions = [
  { junctionId: 'JCT_001', name: 'Andheri Junction', location: { lat: 19.1136, lng: 72.8697 }, currentStatus: 'RED', overrideActive: false },
  { junctionId: 'JCT_002', name: 'Bandra Signal', location: { lat: 19.0596, lng: 72.8295 }, currentStatus: 'RED', overrideActive: false },
  { junctionId: 'JCT_003', name: 'Dadar Crossing', location: { lat: 19.0178, lng: 72.8478 }, currentStatus: 'GREEN', overrideActive: false },
  { junctionId: 'JCT_004', name: 'Kurla Signal', location: { lat: 19.0726, lng: 72.8800 }, currentStatus: 'RED', overrideActive: false },
  { junctionId: 'JCT_005', name: 'Ghatkopar Junction', location: { lat: 19.0858, lng: 72.9081 }, currentStatus: 'YELLOW', overrideActive: false },
];

// GET /api/traffic/junctions
router.get('/junctions', protect, (req, res) => {
  res.json({ junctions });
});

// POST /api/traffic/override - Override signal
router.post('/override', protect, (req, res) => {
  const { junctionId, status } = req.body;
  const junction = junctions.find(j => j.junctionId === junctionId);
  if (!junction) return res.status(404).json({ message: 'Junction not found' });

  junction.currentStatus = status || 'GREEN';
  junction.overrideActive = true;
  junction.lastUpdated = new Date();

  // Auto-reset after 60 seconds
  setTimeout(() => {
    junction.currentStatus = 'RED';
    junction.overrideActive = false;
  }, 60000);

  res.json({ message: `🚦 Junction ${junctionId} set to ${status}`, junction });
});

// POST /api/traffic/reset/:id
router.post('/reset/:id', protect, (req, res) => {
  const junction = junctions.find(j => j.junctionId === req.params.id);
  if (!junction) return res.status(404).json({ message: 'Junction not found' });
  junction.currentStatus = 'RED';
  junction.overrideActive = false;
  res.json({ message: 'Junction reset', junction });
});

module.exports = router;
