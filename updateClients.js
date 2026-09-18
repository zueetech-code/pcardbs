import fs from "fs";
import Papa from "papaparse";
import admin from "firebase-admin";

// 🔹 Initialize Firebase Admin
// Replace with the path to your Firebase service account JSON
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const adminDb = admin.firestore();

// 🔹 Read CSV
const csvFile = fs.readFileSync("Clients.csv", "utf8");
const parsed = Papa.parse(csvFile, { header: true }).data;

// 🔹 Build mapping: client name → district
// Using lowercase and trimmed strings for robust matching
const clientDistrictMapping = {};
parsed.forEach((row) => {
  if (row.name && row.district) {  // make sure CSV header is "district"
    clientDistrictMapping[row.name.trim().toLowerCase()] = row.district.trim();
  }
});

async function updateClientDistricts() {
  const clientsRef = adminDb.collection("clients");
  const snapshot = await clientsRef.get();

  let count = 0;
  const batch = adminDb.batch();

  snapshot.forEach((docSnap) => {
    const clientName = docSnap.data().name?.trim().toLowerCase();
    const district = clientDistrictMapping[clientName];

    if (district) {
      batch.update(docSnap.ref, { district });
      count++;
    } else {
      console.log(`❌ No match for client: "${docSnap.data().name}"`);
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ ${count} clients updated successfully!`);
  } else {
    console.log("⚠️ No clients were updated.");
  }
}

// Run the update
updateClientDistricts().catch(console.error);