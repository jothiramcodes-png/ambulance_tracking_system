const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  ambulanceId: { type: String, required: true, unique: true },
  vehicleNo: { type: String, required: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String },
  currentLocation: {
    lat: { type: Number, default: 19.076 },
    lng: { type: Number, default: 72.877 }
  },
  status: { type: String, enum: ['idle', 'active', 'en-route', 'arrived'], default: 'idle' },
  assignedHospital: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ambulance', ambulanceSchema);
