export const scenarios = [
  {
    id: 'reported-shoplifting',
    title: 'Reported Shoplifting',
    module: 'Module 2: Legal System and Security Professionals',
    difficulty: 'Medium',
    skills: ['Legal judgment', 'Observation', 'Documentation'],
    sceneImage:
      'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1200&q=80',
    intro:
      'You are standing near the entrance of a retail store. An employee reports a customer may have placed headphones in a bag and is moving toward the exit.',
    manualConcept: {
      title: 'Observe, Deter, Report and Legal Limits',
      summary:
        'Security professionals should gather facts, stay within legal authority, and document clearly.',
      sourcePage: 'Module 1 and Module 2',
    },
    steps: [
      {
        stepId: 'step-1',
        dialogue:
          "Employee: 'That customer put headphones in their bag. They are walking toward the exit.'",
        question: 'What do you do first?',
        choices: [
          { choiceId: 'A', text: 'Stop the person and search their bag.', isCorrect: false, feedbackKey: 'improper-search', riskScores: { legalRisk: 90, safetyRisk: 55, professionalism: 25, communication: 30, documentation: 20 } },
          { choiceId: 'B', text: 'Ask the employee what they saw, observe the person, and follow site policy.', isCorrect: true, feedbackKey: 'observe-gather-facts', riskScores: { legalRisk: 10, safetyRisk: 10, professionalism: 90, communication: 80, documentation: 85 } },
          { choiceId: 'C', text: 'Grab the person before they leave.', isCorrect: false, feedbackKey: 'unsafe-force', riskScores: { legalRisk: 85, safetyRisk: 75, professionalism: 20, communication: 20, documentation: 15 } },
          { choiceId: 'D', text: 'Ignore it because only police can handle theft.', isCorrect: false, feedbackKey: 'inaction', riskScores: { legalRisk: 60, safetyRisk: 45, professionalism: 30, communication: 25, documentation: 10 } },
        ],
      },
      {
        stepId: 'step-2',
        dialogue: 'The person exits the store and is now off property.',
        question: 'What information should you record?',
        choices: [
          { choiceId: 'A', text: 'Appearance, time, direction, what was reported, and who reported it.', isCorrect: true, feedbackKey: 'objective-notes', riskScores: { legalRisk: 15, safetyRisk: 10, professionalism: 90, communication: 75, documentation: 95 } },
          { choiceId: 'B', text: 'Your opinion that they are definitely guilty.', isCorrect: false, feedbackKey: 'opinion-reporting', riskScores: { legalRisk: 80, safetyRisk: 30, professionalism: 35, communication: 40, documentation: 20 } },
          { choiceId: 'C', text: 'Only clothing color.', isCorrect: false, feedbackKey: 'incomplete-report', riskScores: { legalRisk: 55, safetyRisk: 25, professionalism: 45, communication: 40, documentation: 35 } },
          { choiceId: 'D', text: 'Nothing, because the person left.', isCorrect: false, feedbackKey: 'no-documentation', riskScores: { legalRisk: 70, safetyRisk: 35, professionalism: 25, communication: 20, documentation: 5 } },
        ],
      },
    ],
    examCheck: {
      question: 'What is the safest first response to an unconfirmed theft report?',
      options: ['Search the person immediately', 'Gather facts, observe, and follow policy', 'Use force before exit', 'Ignore the report'],
      answerIndex: 1,
      explanation: 'Gathering facts and following policy keeps actions legal, safe, and professional.',
    },
  },
  {
    id: 'angry-visitor-front-desk',
    title: 'Angry Visitor at Front Desk',
    module: 'Module 3: Communication and Conflict Management',
    difficulty: 'Medium',
    skills: ['Communication', 'De-escalation', 'Safety'],
    sceneImage: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
    intro: 'You are posted at an office front desk. A visitor denied access starts yelling.',
    manualConcept: {
      title: 'Professional Communication and De-escalation',
      summary: 'Remain calm, keep safe distance, use clear instructions, and escalate through proper channels.',
      sourcePage: 'Module 4',
    },
    steps: [
      {
        stepId: 'step-1',
        dialogue: "Visitor: 'You have no right to stop me. Let me in now.'",
        question: 'What is the best first response?',
        choices: [
          { choiceId: 'A', text: 'Raise your voice to assert control.', isCorrect: false, feedbackKey: 'escalate-voice', riskScores: { legalRisk: 45, safetyRisk: 70, professionalism: 20, communication: 20, documentation: 40 } },
          { choiceId: 'B', text: 'Stay calm, keep safe distance, and explain policy politely.', isCorrect: true, feedbackKey: 'calm-policy', riskScores: { legalRisk: 10, safetyRisk: 10, professionalism: 95, communication: 95, documentation: 70 } },
          { choiceId: 'C', text: 'Physically block them immediately.', isCorrect: false, feedbackKey: 'premature-force', riskScores: { legalRisk: 75, safetyRisk: 80, professionalism: 30, communication: 15, documentation: 50 } },
          { choiceId: 'D', text: 'Ignore them completely.', isCorrect: false, feedbackKey: 'non-engagement', riskScores: { legalRisk: 50, safetyRisk: 65, professionalism: 25, communication: 10, documentation: 30 } },
        ],
      },
      {
        stepId: 'step-2',
        dialogue: 'The visitor continues yelling and refuses instructions.',
        question: 'What should you do next?',
        choices: [
          { choiceId: 'A', text: 'Threaten immediate arrest.', isCorrect: false, feedbackKey: 'false-authority', riskScores: { legalRisk: 85, safetyRisk: 75, professionalism: 20, communication: 20, documentation: 45 } },
          { choiceId: 'B', text: 'Use calm instructions, request assistance, and document incident.', isCorrect: true, feedbackKey: 'request-assistance', riskScores: { legalRisk: 15, safetyRisk: 20, professionalism: 90, communication: 90, documentation: 90 } },
          { choiceId: 'C', text: 'Insult them back.', isCorrect: false, feedbackKey: 'provocation', riskScores: { legalRisk: 60, safetyRisk: 80, professionalism: 5, communication: 5, documentation: 30 } },
          { choiceId: 'D', text: 'Leave your post without notifying anyone.', isCorrect: false, feedbackKey: 'abandon-post', riskScores: { legalRisk: 65, safetyRisk: 85, professionalism: 10, communication: 5, documentation: 10 } },
        ],
      },
    ],
    examCheck: {
      question: 'Which action best reduces escalation risk?',
      options: ['Yell louder', 'Stay calm and professional', 'Use insults', 'Walk away silently'],
      answerIndex: 1,
      explanation: 'Calm, respectful communication helps lower tension and keeps the scene safer.',
    },
  },
  {
    id: 'media-private-building',
    title: 'Media at Private Building',
    module: 'Module 5: Confidentiality and Professional Conduct',
    difficulty: 'Easy',
    skills: ['Confidentiality', 'Professionalism'],
    sceneImage: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    intro: 'You are in a private building lobby. A reporter asks about a senior executive location.',
    manualConcept: {
      title: 'Media Handling and Confidential Information',
      summary: 'Do not disclose private details. Redirect media questions to the authorized representative.',
      sourcePage: 'Module 6',
    },
    steps: [
      {
        stepId: 'step-1',
        dialogue: "Reporter: 'Can you confirm whether the company president is inside right now?'",
        question: 'What should you say?',
        choices: [
          { choiceId: 'A', text: 'Yes, they are upstairs, but I cannot share more.', isCorrect: false, feedbackKey: 'partial-disclosure', riskScores: { legalRisk: 60, safetyRisk: 40, professionalism: 45, communication: 60, documentation: 30 } },
          { choiceId: 'B', text: 'I cannot provide that information. Please contact media representative.', isCorrect: true, feedbackKey: 'proper-referral', riskScores: { legalRisk: 10, safetyRisk: 10, professionalism: 95, communication: 90, documentation: 70 } },
          { choiceId: 'C', text: 'No comment.', isCorrect: false, feedbackKey: 'abrupt-response', riskScores: { legalRisk: 25, safetyRisk: 20, professionalism: 40, communication: 35, documentation: 40 } },
          { choiceId: 'D', text: 'I can tell you if you do not quote me.', isCorrect: false, feedbackKey: 'improper-sharing', riskScores: { legalRisk: 80, safetyRisk: 50, professionalism: 15, communication: 30, documentation: 20 } },
        ],
      },
    ],
    examCheck: {
      question: 'Best response to media requests for confidential information?',
      options: ['Share limited details', 'Redirect to authorized spokesperson', 'Guess safely', 'Say anything off record'],
      answerIndex: 1,
      explanation: 'Refer media to designated contacts and avoid disclosing confidential information.',
    },
  },
];
