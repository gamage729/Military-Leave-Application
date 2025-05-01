// leaveGuideService.js
const advancedLeaveKeywords = {
  "Sick Leave": ["sick", "not well", "ill", "doctor", "medical", "fever", "clinic", "hospital", "health", "unwell", "sick leave"],
  "Annual Leave": [
    "vacation", "holiday", "personal time", "annual leave", "off days", "annual", "travel", 
    "going back", "time off", "leave home", "visit family", "extended leave", "rest", "break", "planned leave"
  ],
  "Emergency Leave": ["emergency", "urgent", "accident", "crisis", "emergency leave", "death", "injury", "critical", "immediate", "urgent matter"],
  "Casual Leave": ["casual", "short break", "1-day leave", "quick break", "personal issue", "casual break", "personal break", "personal matters", "casual leave", "day off"],
  "Short Leave": ["short leave", "brief time", "couple of hours", "short absence", "few hours", "partial day", "brief absence"],
  "Long Leave": ["long leave", "extended", "months off", "long duration", "study", "training", "recovery", "sabbatical", "extended absence", "long-term"],
  "Family Emergency": ["mother", "father", "family", "relative", "home issue", "parents", "funeral", "family member", "family crisis", "relative sick", "family emergency"],
  "Travel Leave": ["ticket", "flight", "train", "travel leave", "journey", "trip", "abroad", "overseas", "visiting", "destination", "travel plans"]
};

// Keywords with their negative weights (to avoid misclassification)
const negativeKeywordWeights = {
  "Travel Leave": {
    "personal matters": -5,
    "short break": -5,
    "day": -3,
    "1-day": -5,
    "casual": -5
  },
  "Casual Leave": {
    "travel": -5,
    "flight": -5,
    "ticket": -5,
    "journey": -5,
    "overseas": -5
  },
  "Sick Leave": {
    "personal matters": -3,
    "vacation": -5,
    "travel": -3
  }
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
    contact: { officer: "Medical Officer", phone: "555-0001" },
    faqs: [
      { question: "How many sick days am I allowed per year?", answer: "Personnel are entitled to 10 sick days annually without a medical certificate. Additional days require proper medical documentation." },
      { question: "Do I need a medical certificate for a single sick day?", answer: "No, medical certificates are typically required for absences of 3 or more consecutive days, but your unit commander may request one at their discretion." },
      { question: "Can I apply for sick leave retroactively?", answer: "Yes, in genuine cases of sudden illness, you can submit your sick leave application within 24 hours of returning to duty with appropriate documentation." }
    ],
    duration: "Based on medical recommendation, typically 1-10 days",
    approval: "Usually approved within 24 hours if properly documented"
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
    contact: { officer: "Commanding Officer", phone: "555-0002" },
    faqs: [
      { question: "How much annual leave do I get?", answer: "Regular personnel receive 30 days of annual leave per fiscal year. Unused leave may be carried over up to a maximum of 60 days." },
      { question: "How far in advance should I apply?", answer: "Annual leave requests should be submitted at least 14 days before the intended start date for proper planning and approval." },
      { question: "Can annual leave be split?", answer: "Yes, you can split your annual leave into multiple periods throughout the year, subject to operational requirements." }
    ],
    duration: "Up to 30 days per fiscal year",
    approval: "Usually requires 3-5 working days for processing"
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
    contact: { officer: "Duty Officer", phone: "555-0003" },
    faqs: [
      { question: "What qualifies as an emergency?", answer: "Emergencies include sudden hospitalization of immediate family members, natural disasters affecting your residence, or other urgent situations requiring immediate attention." },
      { question: "Is emergency leave counted against my annual leave?", answer: "Emergency leave is initially separate, but may be converted to annual leave or other leave categories depending on the nature and duration of the emergency." },
      { question: "How quickly can emergency leave be approved?", answer: "Emergency leave can be approved within hours. In extremely urgent cases, verbal approval may be given with paperwork to follow." }
    ],
    duration: "Initially 3-7 days, can be extended based on circumstances",
    approval: "Expedited approval, usually within hours"
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
    contact: { officer: "Commanding Officer", phone: "555-0004" },
    faqs: [
      { question: "How many casual leaves can I take per month?", answer: "Personnel are typically allowed up to 2 casual leaves per month, not exceeding a total of 10 days annually." },
      { question: "Can casual leave be combined with weekends?", answer: "Yes, casual leave can be attached to weekends, but approval may depend on operational requirements and unit policies." },
      { question: "What are valid reasons for casual leave?", answer: "Casual leave is appropriate for personal matters such as attending to administrative tasks, family functions, or brief personal time that doesn't qualify for other leave categories." }
    ],
    duration: "1-2 days maximum",
    approval: "Usually approved within 24 hours if workload permits"
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
    contact: { officer: "Section Head", phone: "555-0005" },
    faqs: [
      { question: "How many hours can I take for short leave?", answer: "Short leave typically covers absences of 1-4 hours during a working day." },
      { question: "Do I need to make up the hours?", answer: "Depending on unit policy, you may need to make up the hours or have them counted against your leave balance." },
      { question: "How often can I use short leave?", answer: "Short leave should be used sparingly, generally not more than twice a month, unless for medical appointments." }
    ],
    duration: "1-4 hours",
    approval: "Can be approved on the same day if workload permits"
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
    contact: { officer: "HR/Admin Officer", phone: "555-0006" },
    faqs: [
      { question: "What qualifies for long leave?", answer: "Long leave is typically granted for educational pursuits, extended medical recovery, sabbaticals, or other significant personal development activities." },
      { question: "Does long leave affect my service record?", answer: "Long leave may affect certain benefits and progression timelines, especially if taken without pay. Consult with HR for specific implications." },
      { question: "Can I take long leave for personal projects?", answer: "Long leave for personal projects may be considered based on your service record, project relevance to your role, and operational requirements." }
    ],
    duration: "Over 30 days up to 1 year",
    approval: "Requires extensive review, typically 2-4 weeks for decision"
  },
  "Family Emergency": {
    title: "**FAMILY EMERGENCY LEAVE GUIDANCE**",
    steps: [
      "Apply immediately through the Dashboard.",
      "Clearly state the family member and emergency nature.",
      "Attach any available documents (e.g. medical, death certificate)."
    ],
    documents: ["DA Form 31", "Medical Certificate", "Death/Support Letter"],
    contact: { officer: "Family Liaison Officer", phone: "555-0007" },
    faqs: [
      { question: "Which family members qualify for family emergency leave?", answer: "Immediate family members including parents, spouse, children, and siblings typically qualify. Extended family may be considered case-by-case." },
      { question: "How long can I take for a family emergency?", answer: "Initially 3-7 days, which can be extended based on the situation severity and supporting documentation." },
      { question: "Is family emergency leave paid?", answer: "Yes, family emergency leave is generally paid leave, but may be converted to another leave category for extended periods." }
    ],
    duration: "Initially 3-7 days, can be extended based on circumstances",
    approval: "Expedited approval, usually within hours"
  },
  "Travel Leave": {
    title: "**TRAVEL-RELATED LEAVE GUIDANCE**",
    steps: [
      "Submit leave via Dashboard with detailed dates.",
      "Provide a copy of your travel ticket.",
      "Ensure travel fits within allowed duration."
    ],
    documents: ["DA Form 31", "Travel Ticket", "Itinerary"],
    contact: { officer: "Travel Officer", phone: "555-0008" },
    faqs: [
      { question: "Do I get additional days for international travel?", answer: "Yes, international travel may qualify for 1-2 additional travel days depending on the destination's distance." },
      { question: "Can I combine travel leave with other leave types?", answer: "Yes, travel leave can be combined with annual leave or other appropriate categories to accommodate your travel plans." },
      { question: "Are there any restricted destinations?", answer: "Some destinations may be restricted based on security concerns. Consult the Travel Advisory List before booking." },
      { question: "How quickly will my travel leave be approved?", answer: "Travel leave requests are typically processed within 3-5 working days, but may be expedited if tickets have already been purchased." }
    ],
    duration: "Based on travel requirements plus approved leave time",
    approval: "Usually 3-5 days for processing"
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

// Store conversation context for each user
const userContexts = new Map();

// Maximum conversation history to retain
const MAX_HISTORY_LENGTH = 5;

// Common follow-up questions and their patterns
const followUpPatterns = {
  documents: ['document', 'form', 'paperwork', 'certificate', 'da form'],
  contact: ['contact', 'who', 'officer', 'person', 'call', 'phone'],
  steps: ['step', 'process', 'procedure', 'how to', 'how do i'],
  duration: ['how long', 'duration', 'days', 'time period', 'many days'],
  approval: ['approval', 'how soon', 'when', 'approved', 'processing time', 'quick'],
  faq: [] // This will be populated dynamically based on FAQs from all leave types
};

class LeaveGuideService {
  constructor() {
    this.defaultResponse = "I'm here to help with leave-related questions. Could you please provide more details about what type of leave you're interested in?";
    this.initializeFAQPatterns();
  }
  
  /**
   * Initialize FAQ patterns for better matching
   */
  initializeFAQPatterns() {
    // Extract key terms from all FAQs for better matching
    for (const type in leaveProcedures) {
      if (leaveProcedures[type].faqs) {
        leaveProcedures[type].faqs.forEach(faq => {
          // Extract key terms from the question
          const keyTerms = this.extractKeyTerms(faq.question);
          followUpPatterns.faq = [...followUpPatterns.faq, ...keyTerms];
        });
      }
    }
    // Remove duplicates
    followUpPatterns.faq = [...new Set(followUpPatterns.faq)];
  }
  
  /**
   * Extract key terms from a string
   */
  extractKeyTerms(text) {
    return text
      .toLowerCase()
      .replace(/[?.,]/g, '')
      .split(' ')
      .filter(word => word.length > 3 && !['what', 'when', 'where', 'which', 'with', 'that', 'this', 'there', 'these', 'those', 'have', 'does', 'will'].includes(word));
  }

  /**
   * Process user input and maintain conversation context
   * @param {string} userId - Unique identifier for the user
   * @param {string} userInput - The user's message
   * @returns {string} - Response to the user
   */
  async processUserInput(userId, userInput) {
    if (!userInput) return this.defaultResponse;

    // Initialize or retrieve user context
    if (!userContexts.has(userId)) {
      userContexts.set(userId, {
        history: [],
        currentLeaveType: null,
        lastResponse: null,
        conversationStage: 'initial',
        directFollowUpCount: 0
      });
    }

    const userContext = userContexts.get(userId);
    
    // Check for conversation reset commands
    if (this.isResetCommand(userInput)) {
      return this.resetConversation(userId);
    }
    
    // Add user input to history
    userContext.history.push({
      role: 'user',
      content: userInput
    });
    
    // Trim history if too long
    if (userContext.history.length > MAX_HISTORY_LENGTH) {
      userContext.history.shift();
    }

    // Process user input based on context
    const response = await this.generateResponse(userInput, userContext);
    
    // Add response to history
    userContext.history.push({
      role: 'bot',
      content: response
    });
    
    // Update last response
    userContext.lastResponse = response;
    
    return response;
  }

  /**
   * Check if the input is requesting a conversation reset
   */
  isResetCommand(input) {
    const normalizedInput = input.toLowerCase();
    return normalizedInput === 'reset' || 
           normalizedInput === 'start over' || 
           normalizedInput === 'reset conversation' ||
           normalizedInput === 'restart';
  }

  /**
   * Generate appropriate response based on user input and context
   */
  async generateResponse(userInput, userContext) {
    const normalizedInput = userInput.toLowerCase();
    
    // First priority: Check if it's a direct follow-up question to the currently discussed leave type
    if (userContext.currentLeaveType) {
      const followUpResponse = this.handleFollowUp(normalizedInput, userContext);
      if (followUpResponse) {
        userContext.directFollowUpCount++;
        return followUpResponse;
      }
    }
    
    // Second priority: Determine leave type using weighted scoring system
    const detectedLeaveType = this.detectLeaveTypeWithWeightedScore(normalizedInput);
    
    if (detectedLeaveType) {
      if (userContext.currentLeaveType !== detectedLeaveType) {
        // User is switching to a new leave type
        userContext.directFollowUpCount = 0;
      }
      userContext.currentLeaveType = detectedLeaveType;
      userContext.conversationStage = 'leaveTypeIdentified';
      return this.generateGuide(detectedLeaveType);
    }
    
    // Third priority: Check for FAQ questions across all leave types
    const faqResponse = this.checkForFAQs(normalizedInput);
    if (faqResponse) {
      // If the FAQ is for a different leave type, update the context
      if (faqResponse.leaveType && faqResponse.leaveType !== userContext.currentLeaveType) {
        userContext.currentLeaveType = faqResponse.leaveType;
        userContext.directFollowUpCount = 0;
      }
      return faqResponse.answer;
    }
    
    // Fourth priority: Check for general inquiries about leave
    if (normalizedInput.includes('leave') || 
        normalizedInput.includes('off') || 
        normalizedInput.includes('absence')) {
      return this.generateLeaveTypesList();
    }
    
    // Fifth priority: Check for document inquiries
    if (normalizedInput.includes('document') || 
        normalizedInput.includes('form') || 
        normalizedInput.includes('da form')) {
      return this.generateDocumentInfo();
    }
    
    // If we couldn't determine the intent but have an active context, suggest relevant questions
    if (userContext.currentLeaveType) {
      return `I'm not sure I understood your question about ${userContext.currentLeaveType}. You can ask about:\n\n1. Required documents\n2. Contact information\n3. Approval process\n4. Duration\n5. Specific steps to follow`;
    }
    
    // If we couldn't determine the intent at all, provide a general response
    return "I'm not sure I understood your question about leave. You can ask about specific types like sick leave, annual leave, or say 'show all leave types' to see the full list.";
  }

  /**
   * Detect leave type using a weighted scoring system
   * This is more sophisticated than simple keyword matching
   */
  detectLeaveTypeWithWeightedScore(input) {
    const leaveTypeScores = {};
    
    // Initialize scores for all leave types
    for (const type of leaveTypePriorityOrder) {
      leaveTypeScores[type] = 0;
    }
    
    // Calculate positive scores based on keyword matches
    for (const type in advancedLeaveKeywords) {
      const keywords = advancedLeaveKeywords[type];
      
      for (const keyword of keywords) {
        if (input.includes(keyword.toLowerCase())) {
          // Exact or close matches get higher scores
          if (keyword.length > 3) {
            leaveTypeScores[type] += 2; // Higher weight for significant keywords
          } else {
            leaveTypeScores[type] += 1; // Lower weight for short keywords
          }
        }
      }
      
      // Apply negative weights from exclusionary patterns
      if (negativeKeywordWeights[type]) {
        for (const negativeKeyword in negativeKeywordWeights[type]) {
          if (input.includes(negativeKeyword.toLowerCase())) {
            leaveTypeScores[type] += negativeKeywordWeights[type][negativeKeyword];
          }
        }
      }
    }
    
    // Special case handling for common misclassification scenarios
    if (input.includes('personal matters') || input.includes('short break') || 
        (input.includes('day') && input.includes('personal'))) {
      leaveTypeScores["Casual Leave"] += 5; // Strongly favor Casual Leave
    }
    
    if (input.includes('ticket') || input.includes('flight') || 
        (input.includes('travel') && !input.includes('personal'))) {
      leaveTypeScores["Travel Leave"] += 5; // Strongly favor Travel Leave
    }
    
    // Find the leave type with the highest score
    let highestScore = -Infinity;
    let detectedType = null;
    
    for (const type in leaveTypeScores) {
      if (leaveTypeScores[type] > highestScore) {
        highestScore = leaveTypeScores[type];
        detectedType = type;
      }
    }
    
    // Only return a type if the score is positive (to avoid misclassification)
    return highestScore > 0 ? detectedType : null;
  }

  /**
   * Handle follow-up questions related to the current leave type
   */
  handleFollowUp(normalizedInput, userContext) {
    const leaveType = userContext.currentLeaveType;
    if (!leaveType) return null;

    const leaveInfo = leaveProcedures[leaveType];
    
    // Match against common follow-up patterns
    // Documents
    if (this.matchesPattern(normalizedInput, followUpPatterns.documents)) {
      return `For ${leaveType}, you need the following documents:\n\n${leaveInfo.documents.map((doc, i) => `${i+1}. ${doc}`).join('\n')}`;
    }
    
    // Contact information
    if (this.matchesPattern(normalizedInput, followUpPatterns.contact)) {
      return `For ${leaveType}, contact the ${leaveInfo.contact.officer} at ${leaveInfo.contact.phone}. They will help process your request.`;
    }
    
    // Process steps
    if (this.matchesPattern(normalizedInput, followUpPatterns.steps)) {
      return `The steps for ${leaveType} are:\n\n${leaveInfo.steps.map((step, i) => `${i+1}. ${step}`).join('\n')}`;
    }
    
    // Duration information
    if (this.matchesPattern(normalizedInput, followUpPatterns.duration)) {
      return `For ${leaveType}, the typical duration is: ${leaveInfo.duration}`;
    }
    
    // Approval process
    if (this.matchesPattern(normalizedInput, followUpPatterns.approval)) {
      return `For ${leaveType}, the approval process typically takes ${leaveInfo.approval}`;
    }
    
    // Check for FAQs specific to this leave type
    if (leaveInfo.faqs) {
      for (const faq of leaveInfo.faqs) {
        if (this.isRelatedQuestion(normalizedInput, faq.question)) {
          return faq.answer;
        }
      }
    }
    
    // If no specific follow-up matched, but they mentioned the current leave type again
    if (normalizedInput.includes(leaveType.toLowerCase())) {
      return this.generateGuide(leaveType);
    }
    
    return null;
  }
  
  /**
   * Check if input matches any pattern in the pattern array
   */
  matchesPattern(input, patterns) {
    return patterns.some(pattern => input.includes(pattern));
  }

  /**
   * Check if user's question matches any FAQ across all leave types
   */
  checkForFAQs(normalizedInput) {
    for (const type in leaveProcedures) {
      const leaveInfo = leaveProcedures[type];
      if (leaveInfo.faqs) {
        for (const faq of leaveInfo.faqs) {
          if (this.isRelatedQuestion(normalizedInput, faq.question)) {
            return {
              answer: `${faq.answer} (This is regarding ${type})`,
              leaveType: type
            };
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Check if user question is related to an FAQ
   * Enhanced to be more accurate
   */
  isRelatedQuestion(userInput, faqQuestion) {
    const normalizedFAQ = faqQuestion.toLowerCase();
    
    // Direct match check (for exact matches)
    if (userInput.includes(normalizedFAQ) || normalizedFAQ.includes(userInput)) {
      return true;
    }
    
    // Extract key terms from the FAQ question
    const keyTerms = this.extractKeyTerms(normalizedFAQ);
    
    // Check if multiple key terms appear in the user input
    let matchCount = 0;
    for (const term of keyTerms) {
      if (userInput.includes(term)) {
        matchCount++;
      }
    }
    
    // Calculate match percentage
    const matchPercentage = keyTerms.length > 0 ? matchCount / keyTerms.length : 0;
    
    // Consider it a match if more than 60% of key terms are found
    return matchPercentage > 0.6;
  }

  /**
   * Generate a list of all available leave types
   */
  generateLeaveTypesList() {
    return `**AVAILABLE LEAVE TYPES:**\n\n${leaveTypePriorityOrder.map((type, i) => `${i+1}. ${type}`).join('\n')}\n\nFor more information about a specific type, please ask about it directly.`;
  }

  /**
   * Generate information about required documents
   */
  generateDocumentInfo() {
    return `**COMMON LEAVE DOCUMENTS:**\n\n1. DA Form 31 - Required for all leave types\n2. Medical Certificate - Required for sick leave over 3 days\n3. Travel Itinerary - Required for travel-related leaves\n4. Hospital/Incident Report - Required for emergency leaves\n\nFor specific document requirements, please ask about a particular leave type.`;
  }

  /**
   * Generate guide for specific leave type
   */
  generateGuide(type) {
    if (!leaveProcedures[type]) {
      return "Leave guidance not available.";
    }
    
    const info = leaveProcedures[type];
    
    return `${info.title}\n\n**Steps:**\n${info.steps.map((step, i) => `${i+1}. ${step}`).join('\n')}\n\n**Required Documents:**\n${info.documents.join('\n')}\n\n**Contact Officer:**\n- ${info.contact.officer}\n- Phone: ${info.contact.phone}\n\n**Duration:** ${info.duration}\n\n**Approval Time:** ${info.approval}\n\nYou can ask me follow-up questions about this leave type.`;
  }

  /**
   * Clear user context when needed
   */
  clearUserContext(userId) {
    if (userContexts.has(userId)) {
      userContexts.delete(userId);
    }
  }

  /**
   * Reset conversation for a user
   */
  resetConversation(userId) {
    this.clearUserContext(userId);
    return "Conversation has been reset. How can I help you with leave-related questions?";
  }
  
  /**
   * Debug method to analyze leave type detection
   * Useful for troubleshooting misclassifications
   */
  analyzeInput(input) {
    const scores = {};
    const normalizedInput = input.toLowerCase();
    
    // Calculate scores for each leave type
    for (const type in advancedLeaveKeywords) {
      scores[type] = 0;
      
      // Calculate positive scores
      for (const keyword of advancedLeaveKeywords[type]) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          scores[type] += keyword.length > 3 ? 2 : 1;
        }
      }
      
      // Apply negative weights
      if (negativeKeywordWeights[type]) {
        for (const negativeKeyword in negativeKeywordWeights[type]) {
          if (normalizedInput.includes(negativeKeyword.toLowerCase())) {
            scores[type] += negativeKeywordWeights[type][negativeKeyword];
          }
        }
      }
    }
    
    // Apply special case rules
    if (normalizedInput.includes('personal matters') || normalizedInput.includes('short break')) {
      scores["Casual Leave"] += 5;
    }
    
    return {
      input: input,
      scores: scores,
      detectedType: this.detectLeaveTypeWithWeightedScore(normalizedInput)
    };
  }
}

// For backward compatibility
const leaveGuideHandler = async (userInput) => {
  const service = new LeaveGuideService();
  return service.processUserInput('defaultUser', userInput);
};

module.exports = {
  LeaveGuideService,
  leaveGuideHandler
};