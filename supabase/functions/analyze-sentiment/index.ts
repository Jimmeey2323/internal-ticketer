import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  title: string;
  description: string;
  feedback?: string;
  trainerName?: string;
  chatMode?: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, feedback, trainerName, chatMode, conversationHistory, systemPrompt }: AnalysisRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AI API key not configured',
          sentiment: 'neutral',
          score: 50,
          tags: ['pending-analysis'],
          insights: 'AI analysis is not available.'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chat mode for AI feedback chatbot
    if (chatMode && conversationHistory) {
      const messages = [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        ...conversationHistory
      ];

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error('AI chat failed');
      }

      const data = await response.json();
      const chatResponse = data.choices[0].message.content;

      return new Response(
        JSON.stringify({ chatResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Standard sentiment analysis
    const contentToAnalyze = feedback || `${title}\n\n${description}`;
    
    const analysisPrompt = trainerName 
      ? `Analyze feedback about trainer "${trainerName}". Return JSON with: sentiment (positive/negative/neutral/mixed), score (0-100), tags (array), insights, strengths, improvements`
      : `Analyze this support ticket. Return JSON with: sentiment, score (0-100), tags (array), summary, priority (critical/high/medium/low), department`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: analysisPrompt },
          { role: 'user', content: contentToAnalyze }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return new Response(
        JSON.stringify({ sentiment: 'neutral', score: 50, tags: ['error'], insights: 'Analysis failed.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse JSON from response
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { sentiment: 'neutral', score: 50, tags: [], insights: content };
    } catch {
      analysisResult = { sentiment: 'neutral', score: 50, tags: [], insights: content };
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ sentiment: 'neutral', score: 50, tags: ['error'], insights: 'An error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
