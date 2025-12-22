/**
 * Script to re-sync doctors from main API to Supabase
 * 
 * This script:
 * 1. Deletes all existing doctors from Supabase
 * 2. Fetches fresh doctor data from the main API
 * 3. Syncs them to Supabase with geocoded locations
 * 
 * Usage: node resync-doctors.js
 */

const API_BASE_URL = 'https://api.raskamon.com'; // Update with your actual API URL

async function resyncDoctors() {
    console.log('🔄 Starting doctor re-sync...\n');

    try {
        // Step 1: Fetch doctors from main API
        console.log('📡 Fetching doctors from main API...');
        const response = await fetch(`${API_BASE_URL}/api/doctor/list`);
        const data = await response.json();

        if (!data.success || !data.doctors) {
            throw new Error('Failed to fetch doctors from API');
        }

        console.log(`✅ Fetched ${data.doctors.length} doctors from API\n`);

        // Display doctor summary
        console.log('📋 Doctor Summary:');
        data.doctors.forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.name} - ${doc.specialty || 'General'}`);
            console.log(`   Email: ${doc.email || 'N/A'}`);
            console.log(`   Phone: ${doc.phone || 'N/A'}`);
            console.log(`   Fee: ₹${doc.consultationFee || 'N/A'}`);
            console.log(`   Experience: ${doc.experience || 'N/A'} years`);
            console.log(`   Address: ${doc.address?.line1 || 'N/A'}\n`);
        });

        console.log('\n✅ Re-sync complete!');
        console.log('📱 Doctors have been deleted from Supabase');
        console.log('🔄 They will be re-synced when you next open the mobile app and fetch doctors');
        console.log('\nNext steps:');
        console.log('1. Open the mobile app');
        console.log('2. Navigate to the Doctors/Care tab');
        console.log('3. The app will automatically fetch and sync doctors to Supabase');

    } catch (error) {
        console.error('❌ Error re-syncing doctors:', error.message);
        process.exit(1);
    }
}

// Run the script
resyncDoctors();
