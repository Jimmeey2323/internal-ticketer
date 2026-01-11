import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SLA Rules by Priority
const SLA_RULES = {
  critical: { responseHours: 0.25, resolutionHours: 2, escalationHours: 1 },
  high: { responseHours: 1, resolutionHours: 8, escalationHours: 4 },
  medium: { responseHours: 4, resolutionHours: 24, escalationHours: 12 },
  low: { responseHours: 8, resolutionHours: 72, escalationHours: 48 },
};

// Escalation Rules
const ESCALATION_RULES = {
  'Injury During Class': { escalateTo: 'Management', priority: 'critical', immediate: true },
  'Medical Disclosure': { escalateTo: 'HR', priority: 'high', immediate: true },
  'Theft': { escalateTo: 'Security', priority: 'critical', immediate: true },
  'Discrimination': { escalateTo: 'HR', priority: 'high', immediate: false },
  'Staff Misconduct': { escalateTo: 'HR', priority: 'high', immediate: false },
  'Payment Processing': { escalateTo: 'Finance', priority: 'high', immediate: false },
  'Emergency': { escalateTo: 'Management', priority: 'critical', immediate: true },
};

// Department Routing Rules
const DEPARTMENT_ROUTING = {
  "Booking & Technology": { department: "IT/Tech Support", fallback: "Operations" },
  "Customer Service": { department: "Client Success", fallback: "Operations" },
  "Health & Safety": { department: "Operations", fallback: "Management" },
  "Retail Management": { department: "Sales", fallback: "Operations" },
  "Community & Culture": { department: "HR", fallback: "Operations" },
  "Sales & Marketing": { department: "Sales", fallback: "Marketing" },
  "Special Programs": { department: "Operations", fallback: "Training" },
  "Miscellaneous": { department: "Operations", fallback: "Client Success" },
  "Global": { department: "Management", fallback: "Operations" },
};

// Keywords for priority detection
const PRIORITY_KEYWORDS = {
  critical: ['emergency', 'injury', 'hurt', 'bleeding', 'unconscious', 'theft', 'stolen', 'fire', 'safety hazard', 'medical emergency'],
  high: ['angry', 'furious', 'upset', 'complaint', 'refund', 'payment failed', 'overcharged', 'rude staff', 'misconduct', 'discrimination', 'harassment'],
  medium: ['issue', 'problem', 'not working', 'broken', 'feedback', 'concern', 'question'],
  low: ['suggestion', 'feature request', 'minor', 'when possible', 'no rush'],
};

// Keywords for category detection
const CATEGORY_KEYWORDS = {
  "Booking & Technology": ['app', 'website', 'login', 'password', 'booking', 'reservation', 'payment', 'credit card', 'crashed', 'error', 'bug', 'notification'],
  "Customer Service": ['staff', 'front desk', 'service', 'attitude', 'rude', 'unhelpful', 'wait time', 'response', 'communication'],
  "Health & Safety": ['injury', 'hurt', 'accident', 'medical', 'unsafe', 'equipment broken', 'cleaning', 'hygiene', 'covid', 'sanitize'],
  "Retail Management": ['product', 'merchandise', 'purchase', 'price', 'return', 'exchange', 'size', 'stock', 'sold out'],
  "Community & Culture": ['member', 'clique', 'exclusion', 'discrimination', 'inclusive', 'culture', 'behavior'],
  "Sales & Marketing": ['promotion', 'discount', 'membership', 'trial', 'referral', 'advertisement', 'misleading', 'social media'],
  "Special Programs": ['workshop', 'event', 'private session', 'corporate', 'challenge', 'competition'],
};

async function callAI(messages: any[], responseFormat?: any) {
  const apiKey = lovableApiKey || openAIApiKey;
  const apiUrl = lovableApiKey 
    ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  
  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: lovableApiKey ? 'google/gemini-3-flash-preview' : 'gpt-4o-mini',
      messages,
      ...(responseFormat && { response_format: responseFormat }),
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  return response.json();
}

function detectPriorityFromText(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return priority;
      }
    }
  }
  return 'medium';
}

function detectCategoryFromText(text: string): string {
  const lowerText = text.toLowerCase();
  let bestMatch = "Customer Service";
  let maxMatches = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matches = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, description, title, category, subcategory, studioId, categories, subcategories, studios, departments, users } = body;

    // Handle title generation action
    if (action === 'generateTitle') {
      if (!description) {
        return new Response(JSON.stringify({ error: 'Description is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `You are a helpful assistant that generates concise, descriptive ticket titles for a fitness studio support system.
Generate a brief, clear title (max 60 characters) that summarizes the main issue from the description.
The title should be professional and actionable.
Respond with ONLY the title text, no quotes or additional formatting.`;

      const data = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a title for this ticket description:\n\n${description}` }
      ]);

      const generatedTitle = data.choices[0].message.content.trim();
      
      return new Response(JSON.stringify({ title: generatedTitle }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle full analysis for AI Assistant
    if (action === 'fullAnalysis') {
      if (!description) {
        return new Response(JSON.stringify({ error: 'Description is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build context about available options
      const categoryList = categories?.map((c: any) => c.name).join(', ') || 'Customer Service, Booking & Technology, Health & Safety';
      const studioList = studios?.map((s: any) => s.name).join(', ') || 'Various locations';
      const departmentList = departments?.map((d: any) => d.name).join(', ') || 'Operations, Client Success, IT/Tech Support, HR, Sales';

      const systemPrompt = `You are an intelligent ticket analysis assistant for a fitness studio chain. Analyze the user's issue description and extract all relevant information.

Available Categories: ${categoryList}
Available Studios: ${studioList}
Available Departments: ${departmentList}

Your task:
1. Generate a professional, concise ticket title (max 60 chars)
2. Improve the description to be clear and actionable
3. Determine the best category based on the issue
4. Determine the appropriate priority level:
   - CRITICAL: Safety issues, medical emergencies, theft, security breaches
   - HIGH: Payment issues, angry customers, staff misconduct, urgent technical problems
   - MEDIUM: General inquiries, booking issues, feedback, routine requests
   - LOW: Feature requests, general feedback, non-urgent matters
5. Determine the best department to handle this
6. Extract any mentioned details: customer name, trainer name, class name, date/time, location
7. Detect client mood: calm, frustrated, angry, disappointed, understanding
8. Suggest relevant tags

Respond with a JSON object:
{
  "title": "Concise ticket title",
  "improvedDescription": "Clear, actionable description",
  "category": "Best matching category name",
  "subcategory": "Subcategory if applicable",
  "priority": "critical|high|medium|low",
  "department": "Department name",
  "customerName": "Extracted customer name or null",
  "trainerName": "Extracted trainer name or null",
  "className": "Extracted class name or null",
  "classDateTime": "Extracted date/time or null",
  "location": "Extracted studio/location or null",
  "clientMood": "calm|frustrated|angry|disappointed|understanding",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "needsImmediateAttention": boolean,
  "reasoning": "Brief explanation of priority and routing decision"
}`;

      try {
        const data = await callAI(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this issue and extract all ticket details:\n\n${description}` }
          ],
          { type: "json_object" }
        );

        let aiResponse;
        try {
          aiResponse = JSON.parse(data.choices[0].message.content);
        } catch {
          // If parsing fails, create a structured response
          const detectedPriority = detectPriorityFromText(description);
          const detectedCategory = detectCategoryFromText(description);
          
          aiResponse = {
            title: description.substring(0, 60),
            improvedDescription: description,
            category: detectedCategory,
            priority: detectedPriority,
            department: DEPARTMENT_ROUTING[detectedCategory as keyof typeof DEPARTMENT_ROUTING]?.department || 'Operations',
            suggestedTags: ['support', 'needs-review'],
            clientMood: 'calm',
            needsImmediateAttention: detectedPriority === 'critical',
          };
        }

        // Apply escalation rules if applicable
        if (aiResponse.subcategory && ESCALATION_RULES[aiResponse.subcategory as keyof typeof ESCALATION_RULES]) {
          const rule = ESCALATION_RULES[aiResponse.subcategory as keyof typeof ESCALATION_RULES];
          aiResponse.department = rule.escalateTo;
          aiResponse.priority = rule.priority;
          aiResponse.needsImmediateAttention = rule.immediate;
        }

        // Add SLA information
        const sla = SLA_RULES[aiResponse.priority as keyof typeof SLA_RULES] || SLA_RULES.medium;
        aiResponse.sla = sla;

        console.log('Full Analysis Result:', aiResponse);

        return new Response(JSON.stringify(aiResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (aiError) {
        console.error('AI analysis failed, using fallback:', aiError);
        
        // Fallback analysis
        const detectedPriority = detectPriorityFromText(description);
        const detectedCategory = detectCategoryFromText(description);
        
        return new Response(JSON.stringify({
          title: description.substring(0, 60),
          improvedDescription: description,
          category: detectedCategory,
          priority: detectedPriority,
          department: DEPARTMENT_ROUTING[detectedCategory as keyof typeof DEPARTMENT_ROUTING]?.department || 'Operations',
          suggestedTags: ['support', 'needs-review'],
          clientMood: 'calm',
          needsImmediateAttention: detectedPriority === 'critical',
          sla: SLA_RULES[detectedPriority as keyof typeof SLA_RULES] || SLA_RULES.medium,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Default action: routing analysis (backward compatibility)
    const systemPrompt = `You are an intelligent ticket routing assistant for a fitness studio chain. Analyze the ticket content and determine:
1. The most appropriate department to handle this ticket
2. Suggested priority level (critical, high, medium, low)
3. Any tags that should be applied
4. Whether this needs immediate escalation

Available departments: Operations, Facilities, Training, Sales, Client Success, Marketing, Finance, Management, IT/Tech Support, HR, Security

Priority guidelines:
- CRITICAL: Safety incidents, medical emergencies, theft, security breaches, major system outages
- HIGH: Payment issues, customer complaints, staff misconduct, urgent technical problems
- MEDIUM: General inquiries, booking issues, feedback, routine requests
- LOW: Feature requests, general feedback, non-urgent matters

Respond with a JSON object containing:
{
  "department": "string",
  "priority": "critical|high|medium|low",
  "suggestedTags": ["tag1", "tag2"],
  "needsEscalation": boolean,
  "escalationReason": "string or null",
  "routingConfidence": 0.0-1.0,
  "analysis": "brief explanation of routing decision"
}`;

    const userPrompt = `Analyze this ticket:
Title: ${title}
Description: ${description}
Category: ${category || 'Not specified'}
Subcategory: ${subcategory || 'Not specified'}
Studio: ${studioId || 'Not specified'}

Determine the best department, priority, and routing for this ticket.`;

    const data = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { type: "json_object" }
    );

    let aiResponse;
    try {
      aiResponse = JSON.parse(data.choices[0].message.content);
    } catch {
      const detectedPriority = detectPriorityFromText(description || '');
      aiResponse = {
        department: "Operations",
        priority: detectedPriority,
        suggestedTags: [],
        needsEscalation: false,
        routingConfidence: 0.5,
        analysis: "Auto-parsed response"
      };
    }

    console.log('AI Routing Result:', aiResponse);

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('Error in analyze-ticket function:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      department: "Operations",
      priority: "medium",
      suggestedTags: [],
      needsEscalation: false,
      routingConfidence: 0,
      analysis: "Auto-routing failed, using default assignment"
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
