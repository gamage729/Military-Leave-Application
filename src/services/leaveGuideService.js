// leaveGuideService.js
const advancedLeaveKeywords = {
  "Sick Leave": ["sick", "not well", "ill", "doctor", "medical", "fever", "clinic"],
  "Annual Leave": [
    "vacation", "holiday", "personal time", "personal leave", "off days", "annual", "home", "travel", 
    "going back", "time off", "leave home", "visit family", "extended leave"
  ],
  "Emergency Leave": ["emergency", "urgent", "accident", "crisis", "hospital", "death", "injury", "critical"],
  "Casual Leave": ["casual", "short break", "1-day leave", "quick break", "personal issue", "casual break", "personal break", "personal matters", "time off"],
  "Short Leave": ["short leave", "brief time", "couple of hours", "short absence"],
  "Long Leave": ["long leave", "extended", "months off", "long duration", "study", "training", "recovery"],
  "Family Emergency": ["mother", "father", "family", "relative", "home issue", "parents", "funeral"],
  "Travel Leave": ["ticket", "flight", "train", "travel", "journey", "trip"]
};

const leaveProcedures = {
  "Sick Leave": {
    title: "**SICK LEAVE GUIDANCE**",
    steps: [
      "Apply through the Dashboard Leave Application Form.",
      "Visit the medical officer or healthcare provider.",
      "Obtain a medical certificate if applicable.",
      "Fill out DA Form 31.",
      "Submit it to your commanding officer."
    ],
    documents: ["Medical Certificate", "DA Form 31"],
    contact: { officer: "Medical Officer", phone: "555-0001" }
  },
  "Annual Leave": {
    title: "**ANNUAL LEAVE GUIDANCE**",
    steps: [
      "Submit your leave request through the Dashboard first.",
      "Mention intended dates and purpose.",
      "Attach travel plans if applicable.",
      "Commanding officer will review and approve."
    ],
    documents: ["DA Form 31", "Travel Itinerary (if any)"],
    contact: { officer: "Commanding Officer", phone: "555-0002" }
  },
  "Emergency Leave": {
    title: "**EMERGENCY LEAVE GUIDANCE**",
    steps: [
      "Apply immediately via the Dashboard.",
      "Specify nature of emergency.",
      "Attach supporting documents (hospital letter, incident report).",
      "Contact commanding officer ASAP."
    ],
    documents: ["DA Form 31", "Hospital/Incident Report"],
    contact: { officer: "Duty Officer", phone: "555-0003" }
  },
  "Casual Leave": {
    title: "**CASUAL LEAVE GUIDANCE**",
    steps: [
      "Submit leave application through Dashboard.",
      "State the reason clearly.",
      "Maximum of 1–2 days allowed.",
      "Approval depends on workload."
    ],
    documents: ["DA Form 31"],
    contact: { officer: "Commanding Officer", phone: "555-0004" }
  },
  "Short Leave": {
    title: "**SHORT LEAVE GUIDANCE**",
    steps: [
      "Apply through the Dashboard.",
      "Used for a few hours of absence.",
      "Mention the purpose and return time.",
      "Must inform direct supervisor."
    ],
    documents: ["DA Form 31"],
    contact: { officer: "Section Head", phone: "555-0005" }
  },
  "Long Leave": {
    title: "**LONG LEAVE GUIDANCE**",
    steps: [
      "Dashboard application is mandatory.",
      "State the long-term purpose (study, recovery, etc.).",
      "Command HQ approval may be required.",
      "Submit all supporting documentation."
    ],
    documents: ["DA Form 31", "Support Letter/Orders"],
    contact: { officer: "HR/Admin Officer", phone: "555-0006" }
  },
  "Family Emergency": {
    title: "**FAMILY EMERGENCY LEAVE GUIDANCE**",
    steps: [
      "Apply immediately through the Dashboard.",
      "Clearly state the family member and emergency nature.",
      "Attach any available documents (e.g. medical, death certificate)."
    ],
    documents: ["DA Form 31", "Medical Certificate", "Death/Support Letter"],
    contact: { officer: "Family Liaison Officer", phone: "555-0007" }
  },
  "Travel Leave": {
    title: "**TRAVEL-RELATED LEAVE GUIDANCE**",
    steps: [
      "Submit leave via Dashboard with detailed dates.",
      "Provide a copy of your travel ticket.",
      "Ensure travel fits within allowed duration."
    ],
    documents: ["DA Form 31", "Travel Ticket", "Itinerary"],
    contact: { officer: "Travel Officer", phone: "555-0008" }
  }
};

const leaveTypePriorityOrder = [
  "Emergency Leave",
  "Family Emergency",
  "Sick Leave",
  "Casual Leave",
  "Short Leave",
  "Long Leave",
  "Travel Leave",
  "Annual Leave"
];

const leaveGuideHandler = async (userInput) => {
  if (!userInput) return "Please provide your leave request reason.";

  const normalizedInput = userInput.toLowerCase();

  for (const type of leaveTypePriorityOrder) {
    const keywords = advancedLeaveKeywords[type];

    if (keywords.some(keyword => normalizedInput.includes(keyword))) {
      return generateGuide(type);
    }
  }

  return "I'm not sure how to help with that.";
};

const generateGuide = (type) => {
  const guides = {
    "Family Emergency": `**FAMILY EMERGENCY LEAVE GUIDANCE**

**Steps:**
- Submit your leave request through the Dashboard immediately.
- Mention the family situation and expected return date.
- Mark it as emergency if urgent.

**Required Documents:**
- DA Form 31
- Hospital letter or proof if applicable

**Contact Officer:**
- Unit Commander
- Phone: 555-0010`,

    "Annual Leave": `**ANNUAL LEAVE GUIDANCE**

**Steps:**
- Submit your leave request through the Dashboard first.
- Mention intended dates and purpose.
- Attach travel plans if applicable.
- Commanding officer will review and approve.

**Required Documents:**
- DA Form 31
- Travel Itinerary (if any)

**Contact Officer:**
- Commanding Officer
- Phone: 555-0002`,

    "Sick Leave": `**SICK LEAVE GUIDANCE**

**Steps:**
- Apply through the Dashboard Leave Application Form.
- Visit the medical officer or healthcare provider.
- Obtain a medical certificate if applicable.
- Fill out DA Form 31.
- Submit it to your commanding officer.

**Required Documents:**
- Medical Certificate
- DA Form 31

**Contact Officer:**
- Medical Officer
- Phone: 555-0001`,

    "Emergency Leave": `**EMERGENCY LEAVE GUIDANCE**

**Steps:**
- Apply immediately via the Dashboard.
- Specify nature of emergency.
- Attach supporting documents (hospital letter, incident report).
- Contact commanding officer ASAP.

**Required Documents:**
- DA Form 31
- Hospital/Incident Report

**Contact Officer:**
- Duty Officer
- Phone: 555-0003`,

    "Casual Leave": `**CASUAL LEAVE GUIDANCE**

**Steps:**
- Submit leave application through Dashboard.
- State the reason clearly.
- Maximum of 1–2 days allowed.
- Approval depends on workload.

**Required Documents:**
- DA Form 31

**Contact Officer:**
- Commanding Officer
- Phone: 555-0004`,

    "Short Leave": `**SHORT LEAVE GUIDANCE**

**Steps:**
- Apply through the Dashboard.
- Used for a few hours of absence.
- Mention the purpose and return time.
- Must inform direct supervisor.

**Required Documents:**
- DA Form 31

**Contact Officer:**
- Section Head
- Phone: 555-0005`,

    "Long Leave": `**LONG LEAVE GUIDANCE**

**Steps:**
- Dashboard application is mandatory.
- State the long-term purpose (study, recovery, etc.).
- Command HQ approval may be required.
- Submit all supporting documentation.

**Required Documents:**
- DA Form 31
- Support Letter/Orders

**Contact Officer:**
- HR/Admin Officer
- Phone: 555-0006`,

    "Travel Leave": `**TRAVEL-RELATED LEAVE GUIDANCE**

**Steps:**
- Submit leave via Dashboard with detailed dates.
- Provide a copy of your travel ticket.
- Ensure travel fits within allowed duration.

**Required Documents:**
- DA Form 31
- Travel Ticket
- Itinerary

**Contact Officer:**
- Travel Officer
- Phone: 555-0008`
  };

  return guides[type] || "Leave guidance not available.";
};

module.exports = {
  leaveGuideHandler // Now only export leaveGuideHandler
};
