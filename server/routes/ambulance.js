const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');

const STORAGE_PATH = path.join(__dirname, '../ambulances.json');

// Initial Demo Store
const INITIAL_DRIVERS = [
  { ambulanceId: 'AMB_101', vehicleNo: 'MH-01-AX-1234', driverName: 'Ravi Kumar', driverPhone: '9876543210', email: 'driver@amt.com', password: 'driver123', currentLocation: { lat: 19.0760, lng: 72.8777 }, status: 'idle', assignedHospital: null },
  { ambulanceId: 'AMB_102', vehicleNo: 'MH-02-BY-5678', driverName: 'Suresh Patel', driverPhone: '9876543211', email: 'suresh@amt.com', password: 'driver123', currentLocation: { lat: 19.0900, lng: 72.8650 }, status: 'idle', assignedHospital: null },
  { ambulanceId: 'AMB_103', vehicleNo: 'MH-03-CZ-9012', driverName: 'Amit Singh', driverPhone: '9876543212', email: 'amit@amt.com', password: 'driver123', currentLocation: { lat: 19.0650, lng: 72.8900 }, status: 'idle', assignedHospital: null },
];

let ambulances = [];

// Load from file or use defaults
try {
  if (fs.existsSync(STORAGE_PATH)) {
    const data = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
    if (data.length > 0) {
      ambulances.push(...data);
    } else {
      ambulances.push(...INITIAL_DRIVERS);
    }
  } else {
    ambulances.push(...INITIAL_DRIVERS);
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(ambulances, null, 2));
  }
} catch (e) {
  ambulances.push(...INITIAL_DRIVERS);
}

const save = () => {
  try { fs.writeFileSync(STORAGE_PATH, JSON.stringify(ambulances, null, 2)); } catch(e) {}
};

// GET /api/ambulance/drivers-public - Public list for fast-login (no auth required)
router.get('/drivers-public', (req, res) => {
  const drivers = ambulances.map(a => ({
    driverName: a.driverName,
    ambulanceId: a.ambulanceId,
    email: a.email || '',
  }));
  res.json({ drivers });
});

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
  save();

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
  save();

  res.json({ message: 'Status updated', ambulance: amb });
});

// POST /api/ambulance/add-driver - Add new ambulance driver
router.post('/add-driver', protect, (req, res) => {
  const { driverName, driverPhone, vehicleNo, email, password } = req.body;

  if (!driverName || !driverPhone || !vehicleNo) {
    return res.status(400).json({ message: 'Driver name, phone, and vehicle number are required' });
  }

  // Check for duplicate vehicle
  const exists = ambulances.find(a => a.vehicleNo === vehicleNo);
  if (exists) {
    return res.status(409).json({ message: 'Vehicle number already registered' });
  }

  const newId = `AMB_${100 + ambulances.length + 1}`;
  const generatedEmail = email || `driver_${Math.random().toString(36).substring(7)}@amt.com`;
  
  const newAmbulance = {
    ambulanceId: newId,
    vehicleNo,
    driverName,
    driverPhone,
    email: generatedEmail,
    password: password || 'driver123',
    currentLocation: { lat: 19.0760, lng: 72.8777 },
    status: 'idle',
    assignedHospital: null,
    createdAt: new Date().toISOString(),
  };

  ambulances.push(newAmbulance);
  save();
  res.status(201).json({ message: '🚑 New ambulance driver added successfully', ambulance: newAmbulance });
});

module.exports = { router, ambulances };
