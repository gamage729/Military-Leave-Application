const getAIResponse = require('../services/deepseek');
const admin = require("firebase-admin");
const db = admin.firestore();

// Helper function to calculate approved leave count for the year
async function getUsedLeavesCount(userId) {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const endOfYear = new Date(new Date().getFullYear(), 11, 31);

  const startOfYearTimestamp = admin.firestore.Timestamp.fromDate(startOfYear);
  const endOfYearTimestamp = admin.firestore.Timestamp.fromDate(endOfYear);

  const usedLeavesSnapshot = await db.collection('leaveRequests')
    .where('userId', '==', userId)
    .where('status', '==', 'approved')
    .where('startDate', '>=', startOfYearTimestamp)
    .where('startDate', '<=', endOfYearTimestamp)
    .get();

  console.log(`[DEBUG] Used leaves count for ${userId}: ${usedLeavesSnapshot.size}`);
  return usedLeavesSnapshot.size;
}

async function handleLeaveRequest(req, res) {
    try {
        const { reason, userId } = req.body;
        if (!reason || !userId) {
            return res.status(400).json({ error: "Leave reason and userId are required." });
        }

        // Leave limit check
        const usedLeaves = await getUsedLeavesCount(userId);
        if (usedLeaves >= 30) {
            return res.json({
                suggestion: "You have reached your annual leave limit. Please contact your commanding officer for further assistance."
            });
        }

        // Get AI-generated response based on leave reason
        const aiResponse = await getAIResponse(reason);
        return res.json({ suggestion: aiResponse });
    } catch (error) {
        console.error("AI Processing Error:", error);
        return res.status(500).json({ error: "Failed to analyze leave request." });
    }
}

module.exports = { handleLeaveRequest };
