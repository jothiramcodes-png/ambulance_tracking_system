const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrate = async () => {
  const jsonPath = path.join(__dirname, '../ambulances.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ ambulances.json not found!');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`🚀 Found ${data.length} records. Migrating to Supabase...`);
  
  for (const item of data) {
    const { data: inserted, error } = await supabase.from('ambulances').upsert({
      "ambulanceId": item.ambulanceId,
      "vehicleNo": item.vehicleNo,
      "driverName": item.driverName,
      "driverPhone": item.driverPhone,
      "email": item.email,
      "password": item.password,
      "currentLocation": item.currentLocation,
      "status": item.status,
      "assignedHospital": item.assignedHospital,
      "createdAt": item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
      "lastUpdated": item.lastUpdated ? new Date(item.lastUpdated).toISOString() : new Date().toISOString()
    }, { onConflict: 'ambulanceId' });
    
    if (error) {
      console.error(`❌ Error inserting ${item.ambulanceId}:`, error.message);
    } else {
      console.log(`✅ Migrated ${item.ambulanceId}`);
    }
  }
  
  console.log('🎉 Migration complete!');
};

migrate();
