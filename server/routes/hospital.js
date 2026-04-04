const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// In-memory incoming ambulances for demo
let incomingAlerts = [
  {
    alertId: 'ALT_001',
    ambulanceId: 'AMB_101',
    vehicleNo: 'MH-01-AX-1234',
    driverName: 'Ravi Kumar',
    eta: new Date(Date.now() + 4 * 60000).toISOString(),
    etaMinutes: 4,
    priority: 'critical',
    patientCondition: 'Cardiac Arrest',
    status: 'en-route'
  }
];

// GET /api/hospital/incoming
router.get('/incoming', protect, (req, res) => {
  res.json({ incoming: incomingAlerts });
});

// POST /api/hospital/ready - Mark hospital ready
router.post('/ready/:alertId', protect, (req, res) => {
  const alert = incomingAlerts.find(a => a.alertId === req.params.alertId);
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  alert.hospitalReady = true;
  res.json({ message: '✅ Hospital marked ready', alert });
});

module.exports = router;
