/**
 * Sync doctors from main API to Supabase
 * Run this with: node sync-doctors-to-supabase.js
 */

const https = require('https');

// Supabase credentials
const SUPABASE_URL = 'https://swcajhaxbtvnpjvuaefa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y2FqaGF4YnR2bnBqdnVhZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIyMTQsImV4cCI6MjA1MDA4ODIxNH0.pRR77gNvPEKb5sAqMtqY29l-PYECudp3e1HVmGZPUKg';

// Backend API
const API_URL = 'https://backend.raskamon.com/api/doctor/list';

// Fetch doctors from main API
function fetchDoctors() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Sync doctors to Supabase
function syncToSupabase(doctors) {
    return new Promise((resolve, reject) => {
        const doctorsToUpsert = doctors.map(doc => ({
            mongo_id: doc._id,
            name: doc.name,
            email: doc.email,
            phone: doc.phone,
            specialty: doc.specialty || 'General Physician',
            degree: doc.degree || doc.specialty,
            image: doc.image,
            about: doc.about,
            experience: doc.experience?.toString(),
            languages: doc.languages || doc.language || 'English, Hindi',
            consultation_fee: doc.consultationFee || 500,
            address_line1: doc.address?.line1,
            address_line2: doc.address?.line2,
            latitude: null,
            longitude: null,
            is_available: doc.isAvailable !== false,
            last_synced_at: new Date().toISOString()
        }));

        const postData = JSON.stringify(doctorsToUpsert);

        const options = {
            hostname: 'swcajhaxbtvnpjvuaefa.supabase.co',
            path: '/rest/v1/doctors_sync',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'resolution=merge-duplicates'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, count: doctorsToUpsert.length });
                } else {
                    reject(new Error(`Failed with status ${res.statusCode}: ${responseData}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

// Main function
async function main() {
    try {
        console.log('🔄 Fetching doctors from main API...\n');

        const result = await fetchDoctors();

        if (!result.success || !result.doctors || result.doctors.length === 0) {
            console.error('❌ No doctors found in API response');
            process.exit(1);
        }

        console.log(`✅ Fetched ${result.doctors.length} doctors\n`);

        // Display doctors
        result.doctors.forEach((doc, i) => {
            console.log(`${i + 1}. ${doc.name}`);
            console.log(`   Specialty: ${doc.specialty || 'N/A'}`);
            console.log(`   Email: ${doc.email || 'N/A'}`);
            console.log(`   Phone: ${doc.phone || 'N/A'}`);
            console.log(`   Fee: ₹${doc.consultationFee || 'N/A'}`);
            console.log('');
        });

        console.log('📤 Syncing to Supabase...\n');

        const syncResult = await syncToSupabase(result.doctors);

        console.log(`✅ Successfully synced ${syncResult.count} doctors to Supabase!`);
        console.log('\n🎉 Done! Doctors are now available in Supabase.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
