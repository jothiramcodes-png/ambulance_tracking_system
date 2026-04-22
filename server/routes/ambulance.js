const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');
const supabase = require('../config/supabaseClient'); // Import Supabase Client

const STORAGE_PATH = path.join(__dirname, '../ambulances.json');

// Initial Demo Store
const INITIAL_DRIVERS = [
  { ambulanceId: 'AMB_101', vehicleNo: 'MH-01-AX-1234', driverName: 'Ravi Kumar', driverPhone: '9876543210', email: 'driver@amt.com', password: 'driver123', currentLocation: { lat: 19.0760, lng: 72.8777 }, status: 'idle', assignedHospital: null },
  { ambulanceId: 'AMB_102', vehicleNo: 'MH-02-BY-5678', driverName: 'Suresh Patel', driverPhone: '9876543211', email: 'suresh@amt.com', password: 'driver123', currentLocation: { lat: 19.0900, lng: 72.8650 }, status: 'idle', assignedHospital: null },
  { ambulanceId: 'AMB_103', vehicleNo: 'MH-03-CZ-9012', driverName: 'Amit Singh', driverPhone: '9876543212', email: 'amit@amt.com', password: 'driver123', currentLocation: { lat: 19.0650, lng: 72.8900 }, status: 'idle', assignedHospital: null },
];

let localAmbulances = [];

// Load from file or use defaults
try {
  if (fs.existsSync(STORAGE_PATH)) {
    const data = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
    if (data.length > 0) {
      localAmbulances.push(...data);
    } else {
      localAmbulances.push(...INITIAL_DRIVERS);
    }
  } else {
    localAmbulances.push(...INITIAL_DRIVERS);
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(localAmbulances, null, 2));
  }
} catch (e) {
  localAmbulances.push(...INITIAL_DRIVERS);
}

const saveLocal = () => {
  try { fs.writeFileSync(STORAGE_PATH, JSON.stringify(localAmbulances, null, 2)); } catch(e) {}
};

// GET /api/ambulance/drivers-public - Public list for fast-login (no auth required)
router.get('/drivers-public', async (req, res) => {
  if (supabase) {
    const { data: dbDrivers, error } = await supabase.from('ambulances').select('driverName, ambulanceId, email');
    if (!error && dbDrivers) {
      return res.json({ drivers: dbDrivers });
    }
  }

  const drivers = localAmbulances.map(a => ({
    driverName: a.driverName,
    ambulanceId: a.ambulanceId,
    email: a.email || '',
  }));
  res.json({ drivers });
});

// GET /api/ambulance - Get all ambulances
router.get('/', protect, async (req, res) => {
  if (supabase) {
    const { data: dbAmbulances, error } = await supabase.from('ambulances').select('*');
    if (!error && dbAmbulances) {
      return res.json({ ambulances: dbAmbulances });
    }
  }

  res.json({ ambulances: localAmbulances });
});

// GET /api/ambulance/:id - Get single ambulance
router.get('/:id', protect, async (req, res) => {
  if (supabase) {
    const { data: amb, error } = await supabase.from('ambulances').select('*').eq('ambulanceId', req.params.id).single();
    if (!error && amb) {
      return res.json(amb);
    }
  }

  const amb = localAmbulances.find(a => a.ambulanceId === req.params.id);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });
  res.json(amb);
});

// POST /api/ambulance/dispatch - Dispatch ambulance
router.post('/dispatch', protect, async (req, res) => {
  const { ambulanceId, destinationHospital, priority, patientInfo } = req.body;

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

  if (supabase) {
    const { data: amb, error } = await supabase.from('ambulances').select('*').eq('ambulanceId', ambulanceId).single();
    if (error || !amb) return res.status(404).json({ message: 'Ambulance not found via Supabase' });

    await supabase.from('ambulances').update({ 
      status: 'en-route',
      assignedHospital: destinationHospital,
      lastUpdated: new Date().toISOString()
    }).eq('ambulanceId', ambulanceId);

    return res.json({ message: '🚑 Ambulance dispatched successfully', trip });
  }

  const amb = localAmbulances.find(a => a.ambulanceId === ambulanceId);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });

  amb.status = 'en-route';
  amb.assignedHospital = destinationHospital;
  saveLocal();

  res.json({ message: '🚑 Ambulance dispatched successfully', trip });
});

// PATCH /api/ambulance/update-status - Update status
router.patch('/update-status', protect, async (req, res) => {
  const { ambulanceId, status, location } = req.body;

  if (supabase) {
    const updates = { lastUpdated: new Date().toISOString() };
    if (status) updates.status = status;
    if (location) updates.currentLocation = location;

    const { data: updatedData, error } = await supabase.from('ambulances').update(updates).eq('ambulanceId', ambulanceId).select();
    if (error || !updatedData || updatedData.length === 0) {
       return res.status(404).json({ message: 'Failed to update or Ambulance not found in DB', error });
    }

    return res.json({ message: 'Status updated', ambulance: updatedData[0] });
  }

  const amb = localAmbulances.find(a => a.ambulanceId === ambulanceId);
  if (!amb) return res.status(404).json({ message: 'Ambulance not found' });

  if (status) amb.status = status;
  if (location) amb.currentLocation = location;
  amb.lastUpdated = new Date();
  saveLocal();

  res.json({ message: 'Status updated', ambulance: amb });
});

// POST /api/ambulance/add-driver - Add new ambulance driver
router.post('/add-driver', protect, async (req, res) => {
  const { driverName, driverPhone, vehicleNo, email, password } = req.body;

  if (!driverName || !driverPhone || !vehicleNo) {
    return res.status(400).json({ message: 'Driver name, phone, and vehicle number are required' });
  }

  let newId;
  const generatedEmail = email || `driver_${Math.random().toString(36).substring(7)}@amt.com`;

  if (supabase) {
    const { data: exists } = await supabase.from('ambulances').select('ambulanceId').eq('vehicleNo', vehicleNo);
    if (exists && exists.length > 0) {
      return res.status(409).json({ message: 'Vehicle number already registered' });
    }

    // Improve ID generation: Get the highest numerical ID to avoid conflicts
    const { data: allIds, error: idError } = await supabase
      .from('ambulances')
      .select('ambulanceId');
    
    let maxNum = 100;
    if (!idError && allIds) {
      allIds.forEach(item => {
        const match = item.ambulanceId.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num > maxNum) maxNum = num;
        }
      });
    }
    
    newId = `AMB_${maxNum + 1}`;

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
      lastUpdated: new Date().toISOString()
    };

    const { data, error } = await supabase.from('ambulances').insert([newAmbulance]).select();
    if (error) {
      console.error('❌ Supabase Insert Error:', error);
      
      // Provide very specific guidance for common Supabase errors
      let errorMessage = 'Database error';
      let errorDetails = error.details || error.message;

      if (error.code === '42501') {
        errorMessage = 'Database Permission Error (RLS)';
        errorDetails = 'Row Level Security policy is missing or denying access for INSERT. Please check your Supabase RLS policies.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate Entry';
        errorDetails = 'This vehicle or ID already exists in the database.';
      }

      return res.status(500).json({ 
        message: errorMessage, 
        error: error.message,
        details: errorDetails,
        code: error.code
      });
    }

    return res.status(201).json({ message: '🚑 New ambulance driver added successfully', ambulance: data[0] });
  }

  const exists = localAmbulances.find(a => a.vehicleNo === vehicleNo);
  if (exists) {
    return res.status(409).json({ message: 'Vehicle number already registered' });
  }

  newId = `AMB_${100 + localAmbulances.length + 1}`;
  
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
    lastUpdated: new Date().toISOString()
  };

  localAmbulances.push(newAmbulance);
  saveLocal();
  res.status(201).json({ message: '🚑 New ambulance driver added successfully', ambulance: newAmbulance });
});

module.exports = { router, localAmbulances };
