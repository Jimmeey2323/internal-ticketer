// Comprehensive SLA, Escalation, and Department Routing Rules

// SLA Rules by Priority
export const SLA_RULES = {
  critical: { 
    label: "Critical",
    responseMinutes: 15, 
    resolutionHours: 2, 
    escalationHours: 1,
    description: "Immediate response required for safety/security issues"
  },
  high: { 
    label: "High",
    responseMinutes: 60, 
    resolutionHours: 8, 
    escalationHours: 4,
    description: "Urgent issues affecting customer experience"
  },
  medium: { 
    label: "Medium",
    responseMinutes: 240, 
    resolutionHours: 24, 
    escalationHours: 12,
    description: "Standard priority for general issues"
  },
  low: { 
    label: "Low",
    responseMinutes: 480, 
    resolutionHours: 72, 
    escalationHours: 48,
    description: "Non-urgent requests and feedback"
  },
} as const;

// Escalation Rules - triggers automatic priority and department changes
export const ESCALATION_RULES = {
  // Critical Escalations (Immediate)
  'Injury During Class': { escalateTo: 'Management', priority: 'critical', immediate: true, notifyLevel: 'all' },
  'Medical Emergency': { escalateTo: 'Management', priority: 'critical', immediate: true, notifyLevel: 'all' },
  'Theft': { escalateTo: 'Security', priority: 'critical', immediate: true, notifyLevel: 'management' },
  'Safety Hazard': { escalateTo: 'Facilities', priority: 'critical', immediate: true, notifyLevel: 'management' },
  'Fire/Emergency': { escalateTo: 'Management', priority: 'critical', immediate: true, notifyLevel: 'all' },
  
  // High Priority Escalations
  'Medical Disclosure': { escalateTo: 'HR', priority: 'high', immediate: true, notifyLevel: 'department' },
  'Discrimination': { escalateTo: 'HR', priority: 'high', immediate: false, notifyLevel: 'management' },
  'Staff Misconduct': { escalateTo: 'HR', priority: 'high', immediate: false, notifyLevel: 'management' },
  'Payment Processing': { escalateTo: 'Finance', priority: 'high', immediate: false, notifyLevel: 'department' },
  'Harassment': { escalateTo: 'HR', priority: 'high', immediate: true, notifyLevel: 'management' },
  'Data Breach': { escalateTo: 'IT/Tech Support', priority: 'critical', immediate: true, notifyLevel: 'all' },
  
  // Medium Priority Escalations
  'Refund Request': { escalateTo: 'Finance', priority: 'medium', immediate: false, notifyLevel: 'department' },
  'Equipment Damage': { escalateTo: 'Facilities', priority: 'medium', immediate: false, notifyLevel: 'department' },
  'App Outage': { escalateTo: 'IT/Tech Support', priority: 'high', immediate: true, notifyLevel: 'department' },
} as const;

// Department Routing Rules by Category
export const DEPARTMENT_ROUTING = {
  "Booking & Technology": { 
    primary: "IT/Tech Support", 
    secondary: "Operations",
    escalationPath: ["IT/Tech Support", "Operations", "Management"]
  },
  "Customer Service": { 
    primary: "Client Success", 
    secondary: "Operations",
    escalationPath: ["Client Success", "Operations", "Management"]
  },
  "Health & Safety": { 
    primary: "Operations", 
    secondary: "Facilities",
    escalationPath: ["Operations", "Facilities", "Management"]
  },
  "Retail Management": { 
    primary: "Sales", 
    secondary: "Operations",
    escalationPath: ["Sales", "Operations", "Finance"]
  },
  "Community & Culture": { 
    primary: "HR", 
    secondary: "Operations",
    escalationPath: ["HR", "Operations", "Management"]
  },
  "Sales & Marketing": { 
    primary: "Sales", 
    secondary: "Marketing",
    escalationPath: ["Sales", "Marketing", "Management"]
  },
  "Special Programs": { 
    primary: "Operations", 
    secondary: "Training",
    escalationPath: ["Operations", "Training", "Management"]
  },
  "Miscellaneous": { 
    primary: "Operations", 
    secondary: "Client Success",
    escalationPath: ["Operations", "Client Success", "Management"]
  },
  "Global": { 
    primary: "Management", 
    secondary: "Operations",
    escalationPath: ["Management", "Operations"]
  },
} as const;

// Priority Detection Keywords
export const PRIORITY_KEYWORDS = {
  critical: [
    'emergency', 'injury', 'hurt', 'bleeding', 'unconscious', 'theft', 'stolen', 
    'fire', 'safety hazard', 'medical emergency', 'cardiac', 'ambulance', 'police',
    'violence', 'assault', 'weapon', 'threat'
  ],
  high: [
    'angry', 'furious', 'upset', 'complaint', 'refund', 'payment failed', 'overcharged', 
    'rude staff', 'misconduct', 'discrimination', 'harassment', 'unacceptable',
    'demand', 'legal', 'lawyer', 'manager', 'escalate', 'immediate', 'urgent'
  ],
  medium: [
    'issue', 'problem', 'not working', 'broken', 'feedback', 'concern', 'question',
    'help', 'confused', 'disappointed', 'trouble', 'incorrect'
  ],
  low: [
    'suggestion', 'feature request', 'minor', 'when possible', 'no rush',
    'idea', 'consider', 'future', 'nice to have', 'optional'
  ],
} as const;

// Category Detection Keywords
export const CATEGORY_KEYWORDS = {
  "Booking & Technology": [
    'app', 'website', 'login', 'password', 'booking', 'reservation', 'payment', 
    'credit card', 'crashed', 'error', 'bug', 'notification', 'link', 'download',
    'mobile', 'browser', 'account', 'email verification', 'sync', 'loading'
  ],
  "Customer Service": [
    'staff', 'front desk', 'service', 'attitude', 'rude', 'unhelpful', 'wait time', 
    'response', 'communication', 'receptionist', 'greeting', 'check-in', 'professional'
  ],
  "Health & Safety": [
    'injury', 'hurt', 'accident', 'medical', 'unsafe', 'equipment broken', 'cleaning', 
    'hygiene', 'covid', 'sanitize', 'ventilation', 'temperature', 'slippery', 'hazard'
  ],
  "Retail Management": [
    'product', 'merchandise', 'purchase', 'price', 'return', 'exchange', 'size', 
    'stock', 'sold out', 'defective', 'quality', 'water bottle', 'towel', 'mat'
  ],
  "Community & Culture": [
    'member', 'clique', 'exclusion', 'discrimination', 'inclusive', 'culture', 
    'behavior', 'community', 'atmosphere', 'welcoming', 'friendly'
  ],
  "Sales & Marketing": [
    'promotion', 'discount', 'membership', 'trial', 'referral', 'advertisement', 
    'misleading', 'social media', 'package', 'pricing', 'contract', 'cancellation'
  ],
  "Special Programs": [
    'workshop', 'event', 'private session', 'corporate', 'challenge', 'competition',
    'special class', 'masterclass', 'retreat', 'popup'
  ],
} as const;

// Keywords indicating member experience issues (requires class details)
export const MEMBER_EXPERIENCE_KEYWORDS = [
  'class', 'trainer', 'instructor', 'teacher', 'session', 'workout', 'exercise',
  'form', 'technique', 'music', 'volume', 'pace', 'level', 'difficulty',
  'crowded', 'space', 'equipment', 'mat', 'props', 'late', 'early',
  'substitution', 'sub', 'replacement', 'quality', 'experience', 'vibe'
];

// Utility functions
export function detectPriority(text: string): keyof typeof SLA_RULES {
  const lowerText = text.toLowerCase();
  
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return priority as keyof typeof SLA_RULES;
      }
    }
  }
  return 'medium';
}

export function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  let bestMatch = "Customer Service";
  let maxMatches = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matches = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = category;
    }
  }
  
  return bestMatch;
}

export function requiresClassDetails(text: string, priority: string, category: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Always require for critical issues
  if (priority === 'critical') return true;
  
  // Require for member experience categories
  if (category === 'Customer Service' || category === 'Health & Safety') {
    // Check if it's class-related
    for (const keyword of MEMBER_EXPERIENCE_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}

export function getEscalationRule(subcategory: string) {
  return ESCALATION_RULES[subcategory as keyof typeof ESCALATION_RULES] || null;
}

export function getDepartmentRouting(category: string) {
  return DEPARTMENT_ROUTING[category as keyof typeof DEPARTMENT_ROUTING] || DEPARTMENT_ROUTING["Miscellaneous"];
}

export function calculateSLADeadline(priority: keyof typeof SLA_RULES, createdAt: Date = new Date()): Date {
  const sla = SLA_RULES[priority];
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + sla.resolutionHours);
  return deadline;
}

export function isNearingSLA(slaDueAt: Date, priority: keyof typeof SLA_RULES): boolean {
  const now = new Date();
  const sla = SLA_RULES[priority];
  const warningThreshold = sla.escalationHours * 60 * 60 * 1000; // Convert to ms
  const timeRemaining = slaDueAt.getTime() - now.getTime();
  return timeRemaining > 0 && timeRemaining <= warningThreshold;
}

export function isSLABreached(slaDueAt: Date): boolean {
  return new Date() > slaDueAt;
}
