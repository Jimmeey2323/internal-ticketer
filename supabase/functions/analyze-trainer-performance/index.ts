import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrainerPerformanceRequest {
  trainerData: any;
  analysisType: 'comprehensive' | 'quick' | 'trend';
  historicalData?: any[];
  comparisonData?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trainerData, analysisType, historicalData, comparisonData }: TrainerPerformanceRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify(getDefaultAnalysis()),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert performance analyst for fitness trainers. Analyze the provided trainer performance data and return a comprehensive JSON analysis.

Your analysis should include:
1. Overall performance score (0-100)
2. Severity assessment (excellent/good/needs-improvement/critical)
3. Sentiment analysis of feedback
4. Trend analysis for each category
5. Pattern recognition in performance data
6. Actionable recommendations prioritized by impact
7. Identification of strengths and areas for improvement
8. Predictive score for next review period
9. Risk factors that may affect future performance

Consider these key performance indicators:
- Client attendance and retention rates
- Client feedback sentiment and themes
- Technical teaching ability (choreography, musicality, energy)
- Professional conduct (punctuality, communication, work ethics)
- Growth trajectory and improvement trends

Return ONLY valid JSON matching this structure:
{
  "overallScore": number,
  "severity": "excellent" | "good" | "needs-improvement" | "critical",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": number (0-1),
  "trends": [{ "category": string, "direction": "improving" | "declining" | "stable", "percentageChange": number }],
  "patterns": [{ "pattern": string, "frequency": number, "impact": "high" | "medium" | "low" }],
  "recommendations": [{ "priority": "high" | "medium" | "low", "category": string, "recommendation": string, "expectedImpact": string }],
  "strengths": [string],
  "areasForImprovement": [string],
  "predictedScore": number,
  "riskFactors": [string]
}`;

    const userContent = `Analyze this trainer performance data:

Trainer: ${trainerData.trainerName}
Specialization: ${trainerData.specialization}
Location: ${trainerData.location}
Review Period: ${trainerData.reviewPeriod}

Overall Score: ${trainerData.overallScore?.toFixed(1) || 'N/A'}/100
Total Classes Taught: ${trainerData.totalClassesTaught || 'N/A'}
Average Attendance: ${trainerData.avgClassAttendance?.toFixed(1) || 'N/A'}
Retention Rate: ${trainerData.avgRetentionRate?.toFixed(1) || 'N/A'}%
Conversion Rate: ${trainerData.avgConversionRate?.toFixed(1) || 'N/A'}%

Category Scores:
${trainerData.categoryScores?.map((c: any) => `- ${c.label}: ${c.score?.toFixed(1)}/${c.maxScore} (${c.trend || 'stable'})`).join('\n') || 'No category data'}

Recent Client Feedback:
${trainerData.clientFeedback?.slice(0, 5).map((f: any) => `- [${f.sentiment}] ${f.content}`).join('\n') || 'No feedback available'}

Internal Feedback:
${trainerData.internalFeedback?.slice(0, 3).map((f: any) => `- ${f.content}`).join('\n') || 'No internal feedback'}

Focus Points:
${trainerData.focusPoints?.[0]?.points?.join('\n- ') || 'None specified'}

Goals:
${trainerData.goals?.map((g: any) => `- ${g.title} (${g.status}, ${g.progress}% complete)`).join('\n') || 'No goals set'}

Historical Performance Trend:
${trainerData.historicalScores?.slice(-6).map((h: any) => `- ${h.period}: ${h.score?.toFixed(1)}`).join('\n') || 'No historical data'}

${historicalData ? `\nHistorical Comparison Data:\n${JSON.stringify(historicalData.slice(-12))}` : ''}
${comparisonData ? `\nTeam Comparison Data:\n${JSON.stringify(comparisonData)}` : ''}

Analysis Type: ${analysisType}
Please provide a ${analysisType === 'comprehensive' ? 'detailed' : analysisType === 'trend' ? 'trend-focused' : 'quick'} analysis.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify(getDefaultAnalysis()),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : getDefaultAnalysis();
    } catch {
      console.error('Failed to parse AI response:', content);
      analysisResult = getDefaultAnalysis();
    }

    // Validate and sanitize the result
    const sanitizedResult = {
      overallScore: Math.max(0, Math.min(100, analysisResult.overallScore || 50)),
      severity: ['excellent', 'good', 'needs-improvement', 'critical'].includes(analysisResult.severity) 
        ? analysisResult.severity : 'good',
      sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(analysisResult.sentiment)
        ? analysisResult.sentiment : 'neutral',
      confidence: Math.max(0, Math.min(1, analysisResult.confidence || 0.7)),
      trends: Array.isArray(analysisResult.trends) ? analysisResult.trends : [],
      patterns: Array.isArray(analysisResult.patterns) ? analysisResult.patterns : [],
      recommendations: Array.isArray(analysisResult.recommendations) ? analysisResult.recommendations : [],
      strengths: Array.isArray(analysisResult.strengths) ? analysisResult.strengths : [],
      areasForImprovement: Array.isArray(analysisResult.areasForImprovement) ? analysisResult.areasForImprovement : [],
      predictedScore: Math.max(0, Math.min(100, analysisResult.predictedScore || analysisResult.overallScore || 50)),
      riskFactors: Array.isArray(analysisResult.riskFactors) ? analysisResult.riskFactors : []
    };

    return new Response(
      JSON.stringify(sanitizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-trainer-performance:', error);
    return new Response(
      JSON.stringify(getDefaultAnalysis()),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultAnalysis() {
  return {
    overallScore: 70,
    severity: 'good',
    sentiment: 'neutral',
    confidence: 0.5,
    trends: [],
    patterns: [],
    recommendations: [
      {
        priority: 'medium',
        category: 'General',
        recommendation: 'Continue monitoring performance metrics',
        expectedImpact: 'Maintain current standards'
      }
    ],
    strengths: ['Consistent performance'],
    areasForImprovement: ['Data collection needed for detailed analysis'],
    predictedScore: 70,
    riskFactors: ['Insufficient data for comprehensive analysis']
  };
}
