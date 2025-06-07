const { db } = require('./firebase'); // Your firebase admin instance

// List of soldier registration IDs to add to whitelist
const soldierIds = [
  "123456",
  "789012",
  "345678",
  "901234"
];

async function addSoldiers() {
  const batch = db.batch();

  soldierIds.forEach(id => {
    const docRef = db.collection("soldiers").doc(id); // Using soldier ID as doc ID
    batch.set(docRef, { registered: false }); // Initial whitelist status
  });

  try {
    await batch.commit();
    console.log("Soldiers added to whitelist successfully.");
  } catch (error) {
    console.error("Error adding soldiers:", error);
  }
}

addSoldiers();
