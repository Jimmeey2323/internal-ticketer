// Studio locations
export const STUDIOS = [
  { id: "kwality-house", name: "Kwality House Kemps Corner", city: "Mumbai" },
  { id: "kenkre-house", name: "Kenkre House", city: "Mumbai" },
  { id: "sufc", name: "South United Football Club", city: "Mumbai" },
  { id: "supreme-hq", name: "Supreme HQ Bandra", city: "Mumbai" },
  { id: "wework-prestige", name: "WeWork Prestige Central", city: "Mumbai" },
  { id: "wework-galaxy", name: "WeWork Galaxy", city: "Mumbai" },
  { id: "copper-cloves", name: "The Studio by Copper + Cloves", city: "Mumbai" },
  { id: "popup", name: "Pop-up", city: "Various" },
] as const;

// Trainers list - complete list with proper structure
export const TRAINERS = [
  { id: "anisha-shah", name: "Anisha Shah", specialization: "Barre" },
  { id: "atulan-purohit", name: "Atulan Purohit", specialization: "Pilates" },
  { id: "janhavi-jain", name: "Janhavi Jain", specialization: "Yoga" },
  { id: "karanvir-bhatia", name: "Karanvir Bhatia", specialization: "HIIT" },
  { id: "karan-bhatia", name: "Karan Bhatia", specialization: "Strength" },
  { id: "mrigakshi-jaiswal", name: "Mrigakshi Jaiswal", specialization: "Barre" },
  { id: "pranjali-jain", name: "Pranjali Jain", specialization: "Pilates" },
  { id: "reshma-sharma", name: "Reshma Sharma", specialization: "Yoga" },
  { id: "richard-dcosta", name: "Richard D'Costa", specialization: "HIIT" },
  { id: "rohan-dahima", name: "Rohan Dahima", specialization: "Strength" },
  { id: "upasna-paranjpe", name: "Upasna Paranjpe", specialization: "Barre" },
  { id: "kajol-kanchan", name: "Kajol Kanchan", specialization: "Pilates" },
  { id: "pushyank-nahar", name: "Pushyank Nahar", specialization: "Yoga" },
  { id: "shruti-kulkarni", name: "Shruti Kulkarni", specialization: "HIIT" },
  { id: "vivaran-dhasmana", name: "Vivaran Dhasmana", specialization: "Strength" },
  { id: "saniya-jaiswal", name: "Saniya Jaiswal", specialization: "Barre" },
  { id: "shruti-suresh", name: "Shruti Suresh", specialization: "Pilates" },
  { id: "cauveri-vikrant", name: "Cauveri Vikrant", specialization: "Yoga" },
  { id: "poojitha-bhaskar", name: "Poojitha Bhaskar", specialization: "HIIT" },
  { id: "nishanth-raj", name: "Nishanth Raj", specialization: "Strength" },
  { id: "siddhartha-kusuma", name: "Siddhartha Kusuma", specialization: "Barre" },
  { id: "simonelle-de-vitre", name: "Simonelle De Vitre", specialization: "Pilates" },
  { id: "kabir-varma", name: "Kabir Varma", specialization: "Yoga" },
  { id: "simran-dutt", name: "Simran Dutt", specialization: "HIIT" },
  { id: "veena-narasimhan", name: "Veena Narasimhan", specialization: "Strength" },
  { id: "anmol-sharma", name: "Anmol Sharma", specialization: "Barre" },
  { id: "bret-saldanha", name: "Bret Saldanha", specialization: "Pilates" },
  { id: "raunak-khemuka", name: "Raunak Khemuka", specialization: "HIIT" },
  { id: "chaitanya-nahar", name: "Chaitanya Nahar", specialization: "Yoga" },
  { id: "sovena-shetty", name: "Sovena Shetty", specialization: "Strength" },
] as const;

// Classes
export const CLASSES = [
  "Studio Barre 57", "Studio Foundations", "Studio Barre 57 Express",
  "Studio Cardio Barre", "Studio FIT", "Studio Mat 57", "Studio SWEAT In 30",
  "Studio Amped Up!", "Studio Back Body Blaze", "Studio Cardio Barre Plus",
  "Studio Cardio Barre Express", "Studio HIIT", "Studio Back Body Blaze Express",
  "Studio Recovery", "Studio Hosted Class", "Studio Trainer's Choice",
  "Studio Pre/Post Natal", "Studio Mat 57 Express", "Studio PowerCycle Express",
  "Studio PowerCycle", "Studio Strength Lab (Pull)", "Studio Strength Lab (Full Body)",
  "Studio Strength Lab (Push)", "Studio Strength Lab"
] as const;

// Categories with their subcategories and default routing
export const CATEGORIES = [
  {
    id: "f4b30263-d66b-4abc-8580-7ae5ad50204d",
    code: "BT",
    name: "Booking & Technology",
    icon: "Smartphone",
    defaultTeam: "Operations",
    defaultPriority: "medium",
    subcategories: [
      "App Issues", "Website Issues", "Class Booking", "Payment Processing",
      "Account Access", "Notifications", "Technical Support", "Booking Failures"
    ]
  },
  {
    id: "92c1ab90-cefb-452c-b555-7bb4e86afb8e",
    code: "CS",
    name: "Customer Service",
    icon: "Headphones",
    defaultTeam: "Client Success",
    defaultPriority: "high",
    subcategories: [
      "Response Time", "Staff Knowledge", "Communication Quality", "Phone Support",
      "Front Desk Service", "Newcomer Experience", "Email/Chat Support",
      "Staff Availability", "Complaint Handling", "Issue Resolution", "Staff Professionalism"
    ]
  },
  {
    id: "bd4c7c4f-b4ea-4d39-9f34-25b4573a106a",
    code: "HS",
    name: "Health & Safety",
    icon: "Shield",
    defaultTeam: "Facilities",
    defaultPriority: "high",
    subcategories: [
      "Medical Disclosure", "Injury During Class", "COVID/Health Protocols",
      "Air Quality", "Emergency Preparedness", "Equipment Safety", "Hygiene Protocols"
    ]
  },
  {
    id: "02069c93-f3db-47f3-8c59-c186fc74e70d",
    code: "RM",
    name: "Retail Management",
    icon: "ShoppingCart",
    defaultTeam: "Sales",
    defaultPriority: "medium",
    subcategories: [
      "Staff Knowledge", "Product Availability", "Product Quality", "Pricing",
      "Return/Exchange"
    ]
  },
  {
    id: "087672a0-423a-4b7c-acaa-d3683e3edd86",
    code: "CC",
    name: "Community & Culture",
    icon: "Users",
    defaultTeam: "Operations",
    defaultPriority: "medium",
    subcategories: [
      "Clique Behavior", "Studio Culture", "Member Behavior", "Discrimination",
      "Inclusivity Issues", "Community Events"
    ]
  },
  {
    id: "cc4d8875-22f5-421a-b235-fd93cefb19d7",
    code: "SM",
    name: "Sales & Marketing",
    icon: "TrendingUp",
    defaultTeam: "Sales",
    defaultPriority: "medium",
    subcategories: [
      "Events & Workshops", "Misleading Information", "Guest Passes/Referrals",
      "Aggressive Selling", "Social Media", "Trial Class Experience",
      "Communication Overload", "Brand Communication"
    ]
  },
  {
    id: "d2fab980-96b8-4147-b99f-6debae7167b0",
    code: "SP",
    name: "Special Programs",
    icon: "Zap",
    defaultTeam: "Operations",
    defaultPriority: "medium",
    subcategories: [
      "Workshop Quality", "Challenges & Competitions", "Special Needs Programs",
      "Corporate Programs", "Private Sessions"
    ]
  },
  {
    id: "dd057e85-62c0-4747-b4ad-773af6542695",
    code: "MISC",
    name: "Miscellaneous",
    icon: "MoreHorizontal",
    defaultTeam: "Operations",
    defaultPriority: "medium",
    subcategories: [
      "Policy Changes", "Feedback System", "Noise Disturbance", "Multi-location Issues",
      "Guest Experience", "Nutrition/Wellness Advice", "Lost & Found"
    ]
  },
  {
    id: "8e5767ff-7c90-4bbe-aacd-2d8f8142ed46",
    code: "GLOBAL",
    name: "Global",
    icon: "Globe",
    defaultTeam: "Operations",
    defaultPriority: "medium",
    subcategories: []
  }
] as const;

// Priority configuration
export const PRIORITIES = {
  critical: { label: "Critical", color: "destructive", slaHours: 2, responseHours: 0.25 },
  high: { label: "High", color: "orange", slaHours: 8, responseHours: 1 },
  medium: { label: "Medium", color: "yellow", slaHours: 24, responseHours: 4 },
  low: { label: "Low", color: "green", slaHours: 72, responseHours: 8 },
} as const;

// Status configuration
export const STATUSES = {
  new: { label: "New", color: "blue" },
  assigned: { label: "Assigned", color: "purple" },
  in_progress: { label: "In Progress", color: "yellow" },
  pending_customer: { label: "Pending Customer", color: "orange" },
  resolved: { label: "Resolved", color: "green" },
  closed: { label: "Closed", color: "gray" },
  reopened: { label: "Reopened", color: "red" },
} as const;

// Client moods
export const CLIENT_MOODS = [
  { value: "calm", label: "Calm", icon: "Smile" },
  { value: "frustrated", label: "Frustrated", icon: "Meh" },
  { value: "angry", label: "Angry", icon: "Angry" },
  { value: "disappointed", label: "Disappointed", icon: "Frown" },
  { value: "understanding", label: "Understanding", icon: "ThumbsUp" },
] as const;

// Client status options
export const CLIENT_STATUSES = [
  { value: "existing_active", label: "Existing Active" },
  { value: "existing_inactive", label: "Existing Inactive" },
  { value: "new_prospect", label: "New Prospect" },
  { value: "trial_client", label: "Trial Client" },
  { value: "guest", label: "Guest (Hosted Class)" },
] as const;

// Departments for routing
export const DEPARTMENTS = [
  "Operations",
  "Facilities",
  "Training",
  "Sales",
  "Client Success",
  "Marketing",
  "Finance",
  "Management",
  "IT/Tech Support",
  "HR",
  "Security",
] as const;

// Trainer feedback metrics
export const TRAINER_FEEDBACK_METRICS = [
  { key: "classAverage", label: "Class Average", description: "Average class rating" },
  { key: "fillRate", label: "Fill Rate", description: "Percentage of class capacity filled" },
  { key: "conversion", label: "Conversion", description: "Trial to member conversion rate" },
  { key: "retention", label: "Retention", description: "Member retention rate" },
  { key: "technique", label: "Technique", description: "Technical instruction quality" },
  { key: "communication", label: "Communication", description: "Communication clarity" },
  { key: "motivation", label: "Motivation", description: "Ability to motivate students" },
  { key: "punctuality", label: "Punctuality", description: "Class start/end timing" },
  { key: "professionalism", label: "Professionalism", description: "Professional conduct" },
] as const;