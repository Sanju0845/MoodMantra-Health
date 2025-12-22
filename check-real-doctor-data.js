/**
 * Fetch real doctor data from API and show what's actually available
 */

const https = require('https');

const API_URL = 'https://backend.raskamon.com/api/doctor/list';

https.get(API_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);

            if (!result.success || !result.doctors) {
                console.error('❌ Failed to fetch doctors');
                return;
            }

            console.log(`✅ Found ${result.doctors.length} doctors in API\n`);
            console.log('📋 REAL DATA FROM API:\n');
            console.log('='.repeat(80));

            result.doctors.forEach((doc, i) => {
                console.log(`\n${i + 1}. Doctor ID: ${doc._id}`);
                console.log(`   Name: ${doc.name || 'NOT SET'}`);
                console.log(`   Email: ${doc.email || 'NOT SET'}`);
                console.log(`   Phone: ${doc.phone || 'NOT SET'}`);
                console.log(`   Specialty: ${doc.specialty || 'NOT SET'}`);
                console.log(`   Degree: ${doc.degree || 'NOT SET'}`);
                console.log(`   Experience: ${doc.experience || 'NOT SET'}`);
                console.log(`   Consultation Fee: ${doc.consultationFee || 'NOT SET'}`);
                console.log(`   About: ${doc.about || 'NOT SET'}`);
                console.log(`   Image: ${doc.image || 'NOT SET'}`);
                console.log(`   Address Line 1: ${doc.address?.line1 || 'NOT SET'}`);
                console.log(`   Address Line 2: ${doc.address?.line2 || 'NOT SET'}`);
                console.log(`   Is Available: ${doc.isAvailable !== undefined ? doc.isAvailable : 'NOT SET'}`);
                console.log(`   Languages: ${doc.languages || doc.language || 'NOT SET'}`);
            });

            console.log('\n' + '='.repeat(80));
            console.log('\n📊 SUMMARY:');

            const hasEmail = result.doctors.filter(d => d.email).length;
            const hasPhone = result.doctors.filter(d => d.phone).length;
            const hasSpecialty = result.doctors.filter(d => d.specialty).length;
            const hasDegree = result.doctors.filter(d => d.degree).length;
            const hasExperience = result.doctors.filter(d => d.experience).length;
            const hasFee = result.doctors.filter(d => d.consultationFee).length;
            const hasAddress = result.doctors.filter(d => d.address?.line1).length;
            const hasAvailability = result.doctors.filter(d => d.isAvailable !== undefined).length;

            console.log(`With Email: ${hasEmail}/${result.doctors.length}`);
            console.log(`With Phone: ${hasPhone}/${result.doctors.length}`);
            console.log(`With Specialty: ${hasSpecialty}/${result.doctors.length}`);
            console.log(`With Degree: ${hasDegree}/${result.doctors.length}`);
            console.log(`With Experience: ${hasExperience}/${result.doctors.length}`);
            console.log(`With Fee: ${hasFee}/${result.doctors.length}`);
            console.log(`With Address: ${hasAddress}/${result.doctors.length}`);
            console.log(`With Availability: ${hasAvailability}/${result.doctors.length}`);

            console.log('\n🔍 RAW JSON for first doctor:');
            console.log(JSON.stringify(result.doctors[0], null, 2));

        } catch (e) {
            console.error('❌ Parse error:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('❌ Request error:', err.message);
});
