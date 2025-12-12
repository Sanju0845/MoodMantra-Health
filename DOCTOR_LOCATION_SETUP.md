# 📍 Doctor Location Setup - Instructions for Database Admin

## Overview
This document provides instructions to add location coordinates to existing doctors in the MongoDB database so they can appear on the "Near Me" map feature in the mobile app.

---

## 1. Doctor Model Update (Backend Code)

Add these location fields to the doctor schema. The backend developer needs to update `backend/models/doctorModel.js`:

```javascript
// Add this to the doctorSchema (inside the schema definition):
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],  // [longitude, latitude]
    default: [0, 0]
  },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  pincode: { type: String }
},

// Add geospatial index for location queries (add after schema definition):
doctorSchema.index({ location: '2dsphere' });
```

---

## 2. MongoDB Update Script

Run this script in MongoDB Shell or MongoDB Compass to add location data to existing doctors:

### Option A: Update All Doctors with Sample Locations (For Testing)

```javascript
// Run in MongoDB Shell or Compass
db.doctors.updateMany(
  {},
  {
    $set: {
      location: {
        type: "Point",
        coordinates: [72.877655, 19.076090], // Default: Mumbai coordinates [longitude, latitude]
        address: "Doctor's Clinic",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400001"
      }
    }
  }
);
```

### Option B: Update Each Doctor Individually with Real Locations

```javascript
// Update doctor by email (example)
db.doctors.updateOne(
  { email: "doctor1@example.com" },
  {
    $set: {
      location: {
        type: "Point",
        coordinates: [72.8777, 19.0760], // [longitude, latitude]
        address: "123 Hospital Road",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400001"
      }
    }
  }
);

// Another doctor
db.doctors.updateOne(
  { email: "doctor2@example.com" },
  {
    $set: {
      location: {
        type: "Point",
        coordinates: [72.8656, 19.0883], // [longitude, latitude]
        address: "456 Medical Plaza",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400005"
      }
    }
  }
);
```

---

## 3. Sample Doctor Location Data (Copy & Paste)

Here are sample coordinates for different cities in India. Use these as reference:

| City | Latitude | Longitude | Coordinates Array |
|------|----------|-----------|-------------------|
| Mumbai | 19.0760 | 72.8777 | [72.8777, 19.0760] |
| Delhi | 28.7041 | 77.1025 | [77.1025, 28.7041] |
| Bangalore | 12.9716 | 77.5946 | [77.5946, 12.9716] |
| Chennai | 13.0827 | 80.2707 | [80.2707, 13.0827] |
| Kolkata | 22.5726 | 88.3639 | [88.3639, 22.5726] |
| Hyderabad | 17.3850 | 78.4867 | [78.4867, 17.3850] |
| Pune | 18.5204 | 73.8567 | [73.8567, 18.5204] |
| Ahmedabad | 23.0225 | 72.5714 | [72.5714, 23.0225] |

**IMPORTANT:** In MongoDB GeoJSON, coordinates are stored as `[longitude, latitude]` (NOT latitude, longitude!)

---

## 4. Complete MongoDB Script (Ready to Run)

```javascript
// ============================================
// RUN THIS IN MONGODB SHELL OR COMPASS
// ============================================

// Step 1: Add location to all doctors with Mumbai as default
db.doctors.updateMany(
  { location: { $exists: false } },  // Only update doctors without location
  {
    $set: {
      location: {
        type: "Point",
        coordinates: [72.8777, 19.0760],
        address: "Medical Center",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400001"
      }
    }
  }
);

// Step 2: Verify the update
db.doctors.find({}, { name: 1, email: 1, "location.coordinates": 1 }).pretty();

// Step 3: Create geospatial index (if not exists)
db.doctors.createIndex({ location: "2dsphere" });
```

---

## 5. Adding Location When Creating New Doctors

When adding new doctors via admin panel, include location data:

```javascript
{
  name: "Dr. John Doe",
  email: "john.doe@hospital.com",
  // ... other fields ...
  location: {
    type: "Point",
    coordinates: [72.8777, 19.0760],  // [longitude, latitude]
    address: "123 Medical Center",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400001"
  }
}
```

---

## 6. How to Get Coordinates for a Location

1. Go to https://www.google.com/maps
2. Right-click on the exact location
3. Click on the coordinates that appear (they will be copied)
4. Format: The copied format is `latitude, longitude`
5. **SWAP them for MongoDB:** Use as `[longitude, latitude]`

Example:
- Google Maps shows: `19.0760, 72.8777`
- MongoDB format: `[72.8777, 19.0760]`

---

## 7. API Endpoint for Nearby Doctors (Optional Enhancement)

If you want to add a dedicated endpoint for nearby doctors, add this to `backend/routes/doctorRoute.js` and `backend/controllers/doctorController.js`:

### Route:
```javascript
doctorRouter.get('/nearby', getNearbyDoctors);
```

### Controller:
```javascript
const getNearbyDoctors = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10000 } = req.query; // maxDistance in meters (default 10km)
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }
    
    const doctors = await doctorModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      available: true
    });
    
    res.status(200).json({
      success: true,
      doctors
    });
  } catch (error) {
    console.error("Error fetching nearby doctors:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching nearby doctors"
    });
  }
};
```

---

## Summary Checklist

- [ ] Update `doctorModel.js` with location schema
- [ ] Run MongoDB script to add location to existing doctors
- [ ] Create geospatial index on location field
- [ ] Verify data with `db.doctors.find({}, { name: 1, location: 1 })`
- [ ] (Optional) Add nearby doctors API endpoint
- [ ] Test on mobile app

---

**Contact:** If you need help, share the list of doctors with their clinic addresses and I can help generate the coordinates.
