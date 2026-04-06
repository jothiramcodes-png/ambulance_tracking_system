const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { ambulances } = require('./ambulance');

// GET /api/hospital/incoming - Dyamic list based on ambulance status
router.get('/incoming', protect, (req, res) => {
  // Returns all ambulances currently en-route
  const incoming = ambulances.filter(a => a.status === 'en-route').map(a => ({
    alertId: `ALT_${a.ambulanceId}`,
    ambulanceId: a.ambulanceId,
    vehicleNo: a.vehicleNo,
    driverName: a.driverName,
    etaMinutes: 5, // Simulated ETA
    priority: 'high',
    patientCondition: 'Emergency',
    status: a.status,
    hospitalReady: a.hospitalReady || false
  }));
  res.json({ incoming });
});

// POST /api/hospital/ready - Mark hospital ready
router.post('/ready/:alertId', protect, (req, res) => {
  const ambulanceId = req.params.alertId.replace('ALT_', '');
  const amb = ambulances.find(a => a.ambulanceId === ambulanceId);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });
  
  amb.hospitalReady = true;
  res.json({ message: '✅ Hospital marked ready', alert: { alertId: req.params.alertId, ...amb } });
});

module.exports = router;
