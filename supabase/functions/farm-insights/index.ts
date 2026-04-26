// Farm AI Insights edge function — uses Lovable AI Gateway
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { farmId } = await req.json();
    if (!farmId) {
      return new Response(JSON.stringify({ error: "farmId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Pull last 60 days of operational data (RLS enforces access)
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceISO = since.toISOString().slice(0, 10);

    const [farm, eggs, feed, mortality, vaccinations, inventory] = await Promise.all([
      supabase.from("farms").select("name, farm_type, bird_capacity, location_district").eq("id", farmId).maybeSingle(),
      supabase.from("egg_production").select("date, trays_collected, damaged_eggs, eggs_per_tray").eq("farm_id", farmId).gte("date", sinceISO),
      supabase.from("feed_usage").select("date, feed_type, quantity_used_kg, remaining_stock_kg").eq("farm_id", farmId).gte("date", sinceISO),
      supabase.from("mortality").select("date, number_dead, suspected_cause, age_weeks").eq("farm_id", farmId).gte("date", sinceISO),
      supabase.from("vaccination").select("date, vaccine_name, birds_vaccinated").eq("farm_id", farmId).gte("date", sinceISO),
      supabase.from("inventory_items").select("name, category, current_quantity, low_stock_threshold, unit").eq("farm_id", farmId),
    ]);

    if (farm.error) throw farm.error;
    if (!farm.data) {
      return new Response(JSON.stringify({ error: "Farm not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalEggs = (eggs.data || []).reduce(
      (s, r: any) => s + (Number(r.trays_collected) || 0) * (Number(r.eggs_per_tray) || 0),
      0,
    );
    const totalDamaged = (eggs.data || []).reduce((s, r: any) => s + (Number(r.damaged_eggs) || 0), 0);
    const totalFeedKg = (feed.data || []).reduce((s, r: any) => s + (Number(r.quantity_used_kg) || 0), 0);
    const totalDeaths = (mortality.data || []).reduce((s, r: any) => s + (Number(r.number_dead) || 0), 0);
    const lowStock = (inventory.data || []).filter(
      (i: any) => Number(i.current_quantity) <= Number(i.low_stock_threshold),
    );

    const summary = {
      farm: farm.data,
      window_days: 60,
      totals: {
        eggs_collected: totalEggs,
        damaged_eggs: totalDamaged,
        feed_used_kg: totalFeedKg,
        deaths: totalDeaths,
        vaccinations_done: (vaccinations.data || []).length,
      },
      mortality_breakdown: mortality.data || [],
      low_stock_items: lowStock,
      inventory_count: (inventory.data || []).length,
    };

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert poultry farm advisor for African (especially Ugandan) farms.
Analyze the JSON farm data and respond ONLY with valid JSON in this exact shape:
{
  "health_score": <0-100 integer>,
  "summary": "<one short sentence overall status>",
  "alerts": [{"severity":"high|medium|low","title":"...","detail":"..."}],
  "recommendations": ["<short actionable tip>", ...]
}
Focus on: mortality rate vs flock size, feed efficiency, egg production trends, vaccination coverage, low stock risks. Keep tone practical and farmer-friendly. Use simple English. Limit to 4 alerts and 5 recommendations.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Farm data:\n${JSON.stringify(summary)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, alerts: [], recommendations: [], health_score: null };
    }

    return new Response(
      JSON.stringify({ insights: parsed, snapshot: summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
