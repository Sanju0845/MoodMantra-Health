const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// CONFIGURATION
const BACKEND_URL = 'https://backend.raskamon.com'; // Production URL
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://swcajhaxbtvnpjvuaefa.supabase.co';
// Using ANON KEY which now has permission (thanks to policy update)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y2FqaGF4YnR2bnBqdnVhZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODk2NTcsImV4cCI6MjA4MTI2NTY1N30.5iKdX7C90PkVrEV8FvaEivCW5sq-AocE6DXQu2fCwno';

if (!SUPABASE_KEY) {
    process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncDoctors() {
    console.log(`🔄 Connecting to Backend: ${BACKEND_URL}...`);

    try {
        // 1. Fetch doctors from MongoDB Backend
        const response = await axios.get(`${BACKEND_URL}/api/doctor/list`);

        if (!response.data.success) {
            throw new Error(`Backend Error: ${response.data.message}`);
        }

        const mongoDoctors = response.data.doctors;
        console.log(`✅ Found ${mongoDoctors.length} doctors in MongoDB.`);

        // 2. Process and Upsert logic
        let newCount = 0;
        let updateCount = 0;

        for (const doc of mongoDoctors) {
            // Map MongoDB fields to Supabase schema
            const doctorPayload = {
                external_id: doc._id,
                name: doc.name,
                specialty: doc.speciality, // Note: MongoDB might use 'speciality' vs 'specialty' in typical schemas, checking payload needed. Assuming 'speciality' based on common typos or 'specialty'
                phone: doc.phone || null,
                email: doc.email,
                image: doc.image,
                about: doc.about,
                degree: doc.degree,
                fees: doc.fees,
                address: doc.address, // store json if needed or stringify
                working_hours: null, // Assuming not available in simple list, or keep existing
                is_active: true,
                updated_at: new Date()
            };

            // We do NOT include 'location', 'latitude', 'longitude' here so they are PRESERVED in Supabase if they exist.
            // If it's a new record, the default "No location available" will apply.

            // UPSERT into Supabase
            const { data, error } = await supabase
                .from('doctors_sync')
                .upsert(doctorPayload, {
                    onConflict: 'external_id',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error(`❌ Failed to sync ${doc.name}:`, error.message);
            } else {
                // console.log(`   Saved: ${doc.name}`);
                // We can't strictly distinguish insert vs update easily without checking first, but upsert handles it.
            }
        }

        console.log(`🎉 Sync Complete! Processed ${mongoDoctors.length} doctors.`);
        console.log(`👉 Now go to Supabase Dashboard to add locations for any new doctors.`);

    } catch (error) {
        console.error('❌ Sync Failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   (Is the Backend Server running?)');
        }
    }
}

// Run the sync
syncDoctors();
