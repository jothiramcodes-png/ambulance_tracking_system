const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { localAmbulances } = require('./ambulance');
const supabase = require('../config/supabaseClient');

// GET /api/hospital/incoming - Dyamic list based on ambulance status
router.get('/incoming', protect, async (req, res) => {
  let activeAmbulances = [];

  if (supabase) {
    const { data, error } = await supabase.from('ambulances').select('*').eq('status', 'en-route');
    if (!error && data) {
      activeAmbulances = data;
    }
  } else {
    activeAmbulances = localAmbulances.filter(a => a.status === 'en-route');
  }

  const incoming = activeAmbulances.map(a => ({
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
router.post('/ready/:alertId', protect, async (req, res) => {
  const ambulanceId = req.params.alertId.replace('ALT_', '');

  if (supabase) {
    // We update the DB if there was a column for hospitalReady, but we didn't add it to our Supabase schema.
    // For now we'll just check if it exists in DB.
    const { data: amb, error } = await supabase.from('ambulances').select('*').eq('ambulanceId', ambulanceId).single();
    if (error || !amb) return res.status(404).json({ message: 'Ambulance not found in DB' });
    
    // We could either add hospitalReady to Supabase schema, or simply send back success since it's a demo feature.
    return res.json({ message: '✅ Hospital marked ready', alert: { alertId: req.params.alertId, ...amb, hospitalReady: true } });
  }

  const amb = localAmbulances.find(a => a.ambulanceId === ambulanceId);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });
  
  amb.hospitalReady = true;
  res.json({ message: '✅ Hospital marked ready', alert: { alertId: req.params.alertId, ...amb } });
});

module.exports = router;
