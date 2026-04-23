import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Egg, Package, AlertTriangle, Syringe, FileText, CalendarRange } from "lucide-react";
import { monthKey, monthLabel } from "@/lib/format";

interface Props {
  workerId: string;
  refreshKey?: number;
}

type RecordRow = { date: string; [key: string]: any };
type AllData = {
  eggs: RecordRow[];
  feed: RecordRow[];
  mortality: RecordRow[];
  vaccination: RecordRow[];
  notes: RecordRow[];
};

const EMPTY: AllData = { eggs: [], feed: [], mortality: [], vaccination: [], notes: [] };

const WorkerMonthlyRecords = ({ workerId, refreshKey }: Props) => {
  const [data, setData] = useState<AllData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [eggs, feed, mortality, vaccination, notes] = await Promise.all([
        supabase.from("egg_production").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
        supabase.from("feed_usage").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
        supabase.from("mortality").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
        supabase.from("vaccination").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
        supabase.from("worker_notes").select("*").eq("worker_id", workerId).order("date", { ascending: false }),
      ]);
      if (cancelled) return;
      setData({
        eggs: eggs.data || [],
        feed: feed.data || [],
        mortality: mortality.data || [],
        vaccination: vaccination.data || [],
        notes: notes.data || [],
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workerId, refreshKey]);

  // All months that have any record, descending
  const months = useMemo(() => {
    const set = new Set<string>();
    [...data.eggs, ...data.feed, ...data.mortality, ...data.vaccination, ...data.notes].forEach((r) =>
      set.add(monthKey(r.date)),
    );
    const arr = Array.from(set).sort((a, b) => (a < b ? 1 : -1));
    if (arr.length === 0) arr.push(monthKey(new Date()));
    return arr;
  }, [data]);

  const [activeMonth, setActiveMonth] = useState<string>(months[0]);
  useEffect(() => {
    if (!months.includes(activeMonth)) setActiveMonth(months[0]);
  }, [months, activeMonth]);

  const monthData = useMemo(() => {
    const filterMonth = <T extends RecordRow>(rows: T[]) => rows.filter((r) => monthKey(r.date) === activeMonth);
    const eggs = filterMonth(data.eggs);
    const feed = filterMonth(data.feed);
    const mortality = filterMonth(data.mortality);
    const vaccination = filterMonth(data.vaccination);
    const notes = filterMonth(data.notes);

    const totals = {
      trays: eggs.reduce((s, r) => s + (Number(r.trays_collected) || 0), 0),
      damagedEggs: eggs.reduce((s, r) => s + (Number(r.damaged_eggs) || 0), 0),
      feedKg: feed.reduce((s, r) => s + (Number(r.quantity_used_kg) || 0), 0),
      deaths: mortality.reduce((s, r) => s + (Number(r.number_dead) || 0), 0),
      vaccinated: vaccination.reduce((s, r) => s + (Number(r.birds_vaccinated) || 0), 0),
      notes: notes.length,
    };

    return { eggs, feed, mortality, vaccination, notes, totals };
  }, [data, activeMonth]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5" />
          My Monthly Records
        </CardTitle>
        <CardDescription>Your personal log entries grouped by month. Only you can see these.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMonth} onValueChange={setActiveMonth}>
          <TabsList className="w-full overflow-x-auto flex-wrap h-auto justify-start gap-1">
            {months.map((m) => (
              <TabsTrigger key={m} value={m} className="whitespace-nowrap">
                {monthLabel(m)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeMonth} className="mt-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryStat icon={Egg} label="Trays Collected" value={monthData.totals.trays} accent="primary" />
              <SummaryStat icon={Package} label="Feed Used (kg)" value={monthData.totals.feedKg} accent="secondary" />
              <SummaryStat icon={AlertTriangle} label="Birds Lost" value={monthData.totals.deaths} accent="destructive" />
              <SummaryStat icon={Syringe} label="Birds Vaccinated" value={monthData.totals.vaccinated} accent="accent" />
              <SummaryStat icon={FileText} label="Notes" value={monthData.totals.notes} accent="muted" />
            </div>

            <Section title="Egg Production" icon={Egg} empty={monthData.eggs.length === 0}>
              {monthData.eggs.map((r) => (
                <Row key={r.id} date={r.date}>
                  <span><strong>{r.trays_collected}</strong> trays · {r.eggs_per_tray}/tray</span>
                  {r.damaged_eggs > 0 && <Badge variant="destructive" className="text-xs">{r.damaged_eggs} damaged</Badge>}
                </Row>
              ))}
            </Section>

            <Section title="Feed Usage" icon={Package} empty={monthData.feed.length === 0}>
              {monthData.feed.map((r) => (
                <Row key={r.id} date={r.date}>
                  <span>{r.feed_type}: <strong>{r.quantity_used_kg} kg</strong></span>
                  <span className="text-xs text-muted-foreground">Stock: {r.remaining_stock_kg} kg</span>
                </Row>
              ))}
            </Section>

            <Section title="Mortality" icon={AlertTriangle} empty={monthData.mortality.length === 0}>
              {monthData.mortality.map((r) => (
                <Row key={r.id} date={r.date}>
                  <span><strong>{r.number_dead}</strong> birds (~{r.age_weeks} wks)</span>
                  <span className="text-xs text-muted-foreground">{r.suspected_cause}</span>
                </Row>
              ))}
            </Section>

            <Section title="Vaccinations" icon={Syringe} empty={monthData.vaccination.length === 0}>
              {monthData.vaccination.map((r) => (
                <Row key={r.id} date={r.date}>
                  <span>{r.vaccine_name} — <strong>{r.birds_vaccinated}</strong> birds</span>
                  <span className="text-xs text-muted-foreground">By {r.administered_by}</span>
                </Row>
              ))}
            </Section>

            <Section title="Notes" icon={FileText} empty={monthData.notes.length === 0}>
              {monthData.notes.map((r) => (
                <Row key={r.id} date={r.date}>
                  <p className="text-sm">{r.notes}</p>
                </Row>
              ))}
            </Section>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const SummaryStat = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  accent: "primary" | "secondary" | "accent" | "destructive" | "muted";
}) => {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-foreground",
  };
  return (
    <div className="rounded-xl border p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accentMap[accent]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

const Section = ({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: any;
  empty: boolean;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border">
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40">
      <Icon className="w-4 h-4 text-primary" />
      <h4 className="font-semibold text-sm">{title}</h4>
    </div>
    {empty ? (
      <p className="px-4 py-3 text-sm text-muted-foreground">No entries this month.</p>
    ) : (
      <div className="divide-y">{children}</div>
    )}
  </div>
);

const Row = ({ date, children }: { date: string; children: React.ReactNode }) => (
  <div className="px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
    <span className="text-xs font-mono text-muted-foreground min-w-[80px]">
      {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
    </span>
    <div className="flex-1 flex items-center justify-between gap-3 flex-wrap">{children}</div>
  </div>
);

export default WorkerMonthlyRecords;
