import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb, Loader2 } from "lucide-react";

interface Alert {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
}
interface Insights {
  health_score: number | null;
  summary: string;
  alerts: Alert[];
  recommendations: string[];
}

interface Props {
  farmId: string;
}

const severityStyles: Record<Alert["severity"], string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-accent/20 text-accent-foreground border-accent/40",
  low: "bg-muted text-muted-foreground border-border",
};

const FarmInsights = ({ farmId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("farm-insights", {
        body: { farmId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data.insights);
      setGeneratedAt(new Date());
    } catch (e: any) {
      toast({
        title: "Couldn't generate insights",
        description: e.message ?? "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  const score = insights?.health_score ?? null;
  const scoreColor =
    score === null
      ? "text-muted-foreground"
      : score >= 75
        ? "text-secondary"
        : score >= 50
          ? "text-accent-foreground"
          : "text-destructive";

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-background">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Farm Insights
            </CardTitle>
            <CardDescription>
              Predictive health & operations analysis based on the last 60 days.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={loading}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading && !insights ? (
            <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Analyzing your farm data…</p>
            </div>
          ) : insights ? (
            <>
              {/* Health Score */}
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Farm Health Score</p>
                  <span className={`text-3xl sm:text-4xl font-bold ${scoreColor}`}>
                    {score ?? "—"}
                    {score !== null && <span className="text-base text-muted-foreground">/100</span>}
                  </span>
                </div>
                {score !== null && <Progress value={score} className="h-2" />}
                <p className="text-sm mt-3">{insights.summary}</p>
              </div>

              {/* Alerts */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-accent-foreground" /> Alerts
                </h4>
                {insights.alerts?.length ? (
                  <div className="space-y-2">
                    {insights.alerts.map((a, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 ${severityStyles[a.severity] ?? severityStyles.low}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm">{a.title}</p>
                          <Badge variant="outline" className="capitalize text-[10px] shrink-0">
                            {a.severity}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-90">{a.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-secondary/10 p-3 text-sm text-secondary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> No active alerts. Your farm is doing great!
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-primary" /> Recommendations
                </h4>
                {insights.recommendations?.length ? (
                  <ul className="space-y-1.5">
                    {insights.recommendations.map((r, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific recommendations right now.</p>
                )}
              </div>

              {generatedAt && (
                <p className="text-[11px] text-muted-foreground text-right">
                  Generated {generatedAt.toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No insights yet. Tap refresh to generate.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmInsights;
