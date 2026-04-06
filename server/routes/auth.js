const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// In-memory users for demo (replace with DB in production)
const DEMO_USERS = [
  { id: '1', name: 'Admin User', email: 'admin@amt.com', password: 'admin123', role: 'admin' },
  { id: '2', name: 'Dr. Sharma', email: 'hospital@amt.com', password: 'hospital123', role: 'hospital_staff', hospitalId: 'HOSP_01' },
  { id: '3', name: 'Driver Ravi', email: 'driver@amt.com', password: 'driver123', role: 'ambulance_driver', ambulanceId: 'AMB_101' },
  { id: '4', name: 'Driver Suresh', email: 'suresh@amt.com', password: 'driver123', role: 'ambulance_driver', ambulanceId: 'AMB_102' },
  { id: '5', name: 'Driver Amit', email: 'amit@amt.com', password: 'driver123', role: 'ambulance_driver', ambulanceId: 'AMB_103' },
];

const JWT_SECRET = process.env.JWT_SECRET || 'amt_secret_key';

const User = require('../models/User');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Try hitting the Database first
    if (mongoose.connection.readyState === 1) {
      const dbUser = await User.findOne({ email });
      if (dbUser && await dbUser.comparePassword(password)) {
        const token = jwt.sign(
          { id: dbUser._id, name: dbUser.name, email: dbUser.email, role: dbUser.role, hospitalId: dbUser.hospitalId, ambulanceId: dbUser.ambulanceId },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({ token, user: { id: dbUser._id, name: dbUser.name, email: dbUser.email, role: dbUser.role } });
      }
    }
  } catch (err) {
    console.error('DB Login Error:', err);
  }

  // Fallback to Demo Users & Dynamic Ambulance Store
  const { ambulances } = require('./ambulance');
  let user = DEMO_USERS.find(u => u.email === email);
  
  if (!user && email) {
    const ambUser = ambulances.find(a => a.email === email);
    if (ambUser) {
      user = { 
        id: ambUser.ambulanceId, 
        name: ambUser.driverName, 
        email: ambUser.email, 
        password: ambUser.password || 'driver123', 
        role: 'ambulance_driver', 
        ambulanceId: ambUser.ambulanceId 
      };
    }
  }

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, hospitalId: user.hospitalId, ambulanceId: user.ambulanceId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, ambulanceId: user.ambulanceId } });
});

// POST /api/auth/fast-login - Dedicated endpoint for driver fast login
router.post('/fast-login', (req, res) => {
  const { ambulanceId } = req.body;
  const { ambulances } = require('./ambulance');
  
  const ambUser = ambulances.find(a => a.ambulanceId === ambulanceId);
  if (!ambUser) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  const user = {
    id: ambUser.ambulanceId,
    name: ambUser.driverName,
    email: ambUser.email || `${ambUser.ambulanceId}@amt.com`,
    role: 'ambulance_driver',
    ambulanceId: ambUser.ambulanceId
  };

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, ambulanceId: user.ambulanceId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user });
});

// POST /api/auth/register (admin only in production)
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
  res.json({ message: 'User registered (connect MongoDB for persistence)', user: { name, email, role: role || 'public' } });
});

module.exports = router;
