const mongoose = require('mongoose');

const trafficJunctionSchema = new mongoose.Schema({
  junctionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  currentStatus: { type: String, enum: ['RED', 'GREEN', 'YELLOW'], default: 'RED' },
  overrideActive: { type: Boolean, default: false },
  overrideExpiresAt: { type: Date },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrafficJunction', trafficJunctionSchema);
