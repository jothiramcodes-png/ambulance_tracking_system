const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// MongoDB (optional – uncomment when MONGO_URI is set)
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));
} else {
  console.log('⚠️  Running in demo mode (no MongoDB). Set MONGO_URI in .env to persist data.');
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ambulance', require('./routes/ambulance').router);
app.use('/api/traffic', require('./routes/traffic'));
app.use('/api/hospital', require('./routes/hospital'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: '🚑 Smart Ambulance Tracking API is running', version: '1.0.0', time: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  const clientPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientPath));
  
  app.get('/{*splat}', (req, res) => {
    // Only serve index.html if it's not an API call
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    } else {
      res.status(404).json({ message: 'API Route Not Found' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: '🚑 Smart Ambulance Tracking API is running (Dev)', version: '1.0.0' });
  });
}

// ─── Socket.io Real-time Engine ────────────────────────────────────────────────
const activeTrips = {};  // tripId -> trip data

io.on('connection', (socket) => {
  console.log(`👤 Connected: ${socket.id}`);

  // Join a room (tracking_room, hospital_HOSP01, admin_room)
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`🏠 ${socket.id} joined: ${room}`);
    socket.emit('join_confirm', { room, message: `Joined ${room}` });
  });

  // Ambulance sends live GPS → broadcast to tracking_room + admin_room
  socket.on('update_location', (data) => {
    // data = { tripId, ambulanceId, location: { lat, lng } }
    io.to('tracking_room').emit('location_update', data);
    io.to('admin_room').emit('location_update', data);

    // Check proximity to junctions (500m radius simulation)
    checkGreenCorridor(data, socket);
    console.log(`📍 [${data.ambulanceId}] ${JSON.stringify(data.location)}`);
  });

  // Manual green corridor trigger
  socket.on('trigger_green_corridor', (data) => {
    // data = { junctionId, junctionName, status: 'GREEN' }
    io.emit('green_corridor_active', { ...data, timestamp: new Date().toISOString() });
    console.log(`🚦 Green Corridor: Junction ${data.junctionId}`);

    // Auto-reset after 60 seconds
    setTimeout(() => {
      io.emit('green_corridor_reset', { junctionId: data.junctionId, status: 'RED' });
    }, 60000);
  });

  // Dispatch a new emergency trip
  socket.on('dispatch_ambulance', (data) => {
    activeTrips[data.tripId] = { ...data, startTime: new Date().toISOString() };
    io.to('admin_room').emit('trip_dispatched', data);
    io.emit('new_emergency_alert', { // broadcast to all
      ambulanceId: data.ambulanceId,
      destination: data.destinationHospital,
      priority: data.priority,
      eta: data.eta,
      timestamp: new Date().toISOString()
    });
    console.log(`🆘 Trip dispatched: ${data.tripId}`);
  });

  // Complete a trip
  socket.on('complete_trip', (data) => {
    if (activeTrips[data.tripId]) delete activeTrips[data.tripId];
    io.to('admin_room').emit('trip_completed', { ...data, endTime: new Date().toISOString() });
    console.log(`✅ Trip completed: ${data.tripId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

// Green Corridor proximity check (simulate 500m radius)
// Keeps a cache of dynamically generated junctions to prevent spamming
const dynamicJunctions = {};

function checkGreenCorridor(data, socket) {
  const {"lat": lat, "lng": lng} = data.location;
  if (!lat || !lng) return;

  const JUNCTION_TRIGGER_RADIUS = 0.005; // ~500m in lat/lng degrees
  const DEMO_JUNCTIONS = [
    { junctionId: 'JCT_001', lat: 19.1136, lng: 72.8697 },
    { junctionId: 'JCT_002', lat: 19.0596, lng: 72.8295 },
  ];

  // Dynamically create a junction right in front of the ambulance's real location 
  // so the Green Corridor demo triggers correctly anywhere in the world.
  if (!dynamicJunctions[data.ambulanceId]) {
    dynamicJunctions[data.ambulanceId] = {
      junctionId: `JCT_LOCAL_${Math.floor(Math.random() * 1000)}`,
      lat: lat + 0.002,
      lng: lng + 0.002
    };
  }
  DEMO_JUNCTIONS.push(dynamicJunctions[data.ambulanceId]);

  DEMO_JUNCTIONS.forEach(j => {
    const dist = Math.sqrt(Math.pow(lat - j.lat, 2) + Math.pow(lng - j.lng, 2));
    if (dist < JUNCTION_TRIGGER_RADIUS) {
      io.emit('green_corridor_active', {
        junctionId: j.junctionId,
        status: 'GREEN',
        auto: true,
        ambulanceId: data.ambulanceId,
        timestamp: new Date().toISOString()
      });
    }
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 AMT Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`\n📋 Demo Credentials:`);
  console.log(`   Admin:    admin@amt.com    / admin123`);
  console.log(`   Hospital: hospital@amt.com / hospital123`);
  console.log(`   Driver:   driver@amt.com   / driver123\n`);
});
