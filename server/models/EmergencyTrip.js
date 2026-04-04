const mongoose = require('mongoose');

const emergencyTripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  ambulanceId: { type: String, required: true },
  destinationHospital: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
  patientInfo: {
    age: Number,
    condition: String,
    notes: String
  },
  startLocation: { lat: Number, lng: Number },
  destination: { lat: Number, lng: Number },
  routePath: [{ lat: Number, lng: Number }],
  startTime: { type: Date, default: Date.now },
  eta: { type: Date },
  endTime: { type: Date },
  status: { type: String, enum: ['dispatched', 'en-route', 'arrived', 'completed'], default: 'dispatched' },
  junctionsOverridden: { type: Number, default: 0 },
  timeSavedMinutes: { type: Number, default: 0 }
});

module.exports = mongoose.model('EmergencyTrip', emergencyTripSchema);
