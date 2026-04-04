const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// In-memory ambulance store for demo
let ambulances = [
  { ambulanceId: 'AMB_101', vehicleNo: 'MH-01-AX-1234', driverName: 'Ravi Kumar', driverPhone: '9876543210', currentLocation: { lat: 19.0760, lng: 72.8777 }, status: 'idle', assignedHospital: null },
  { ambulanceId: 'AMB_102', vehicleNo: 'MH-02-BY-5678', driverName: 'Suresh Patel', driverPhone: '9876543211', currentLocation: { lat: 19.0900, lng: 72.8650 }, status: 'idle', assignedHospital: null },
  { ambulanceId: 'AMB_103', vehicleNo: 'MH-03-CZ-9012', driverName: 'Amit Singh', driverPhone: '9876543212', currentLocation: { lat: 19.0650, lng: 72.8900 }, status: 'idle', assignedHospital: null },
];

// GET /api/ambulance - Get all ambulances
router.get('/', protect, (req, res) => {
  res.json({ ambulances });
});

// GET /api/ambulance/:id - Get single ambulance
router.get('/:id', protect, (req, res) => {
  const amb = ambulances.find(a => a.ambulanceId === req.params.id);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });
  res.json(amb);
});

// POST /api/ambulance/dispatch - Dispatch ambulance
router.post('/dispatch', protect, (req, res) => {
  const { ambulanceId, destinationHospital, priority, patientInfo } = req.body;
  const amb = ambulances.find(a => a.ambulanceId === ambulanceId);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });

  amb.status = 'en-route';
  amb.assignedHospital = destinationHospital;

  const trip = {
    tripId: `TRIP_${Date.now()}`,
    ambulanceId,
    destinationHospital,
    priority: priority || 'high',
    patientInfo,
    startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 8 * 60000).toISOString(),
    status: 'dispatched'
  };

  res.json({ message: '🚑 Ambulance dispatched successfully', trip });
});

// PATCH /api/ambulance/update-status - Update status
router.patch('/update-status', protect, (req, res) => {
  const { ambulanceId, status, location } = req.body;
  const amb = ambulances.find(a => a.ambulanceId === ambulanceId);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });

  if (status) amb.status = status;
  if (location) amb.currentLocation = location;
  amb.lastUpdated = new Date();

  res.json({ message: 'Status updated', ambulance: amb });
});

module.exports = router;
