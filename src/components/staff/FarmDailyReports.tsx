import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Egg, Package, HeartCrack, Syringe, FileText, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  farmId: string;
}

interface WorkerLite {
  id: string;
  full_name: string;
}

type AnyRow = Record<string, any>;

const fmtDate = (d: string) => new Date(d).toLocaleDateString();
const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const FarmDailyReports = ({ farmId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [eggs, setEggs] = useState<AnyRow[]>([]);
  const [feed, setFeed] = useState<AnyRow[]>([]);
  const [mortality, setMortality] = useState<AnyRow[]>([]);
  const [vacc, setVacc] = useState<AnyRow[]>([]);
  const [notes, setNotes] = useState<AnyRow[]>([]);
  const [live, setLive] = useState(false);

  const workerName = (id: string) => workers[id] ?? "Worker";

  const fetchAll = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString().slice(0, 10);

    const [w, e, f, m, v, n] = await Promise.all([
      supabase.from("workers").select("id, full_name").eq("farm_id", farmId),
      supabase.from("egg_production").select("*").eq("farm_id", farmId).gte("date", sinceISO).order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("feed_usage").select("*").eq("farm_id", farmId).gte("date", sinceISO).order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("mortality").select("*").eq("farm_id", farmId).gte("date", sinceISO).order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("vaccination").select("*").eq("farm_id", farmId).gte("date", sinceISO).order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("worker_notes").select("*").eq("farm_id", farmId).gte("date", sinceISO).order("date", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    const wmap: Record<string, string> = {};
    (w.data ?? []).forEach((x: WorkerLite) => (wmap[x.id] = x.full_name));
    setWorkers(wmap);
    setEggs(e.data ?? []);
    setFeed(f.data ?? []);
    setMortality(m.data ?? []);
    setVacc(v.data ?? []);
    setNotes(n.data ?? []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        await fetchAll();
      } catch (err: any) {
        toast({ title: "Couldn't load reports", description: err.message, variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  // Realtime: listen to inserts/updates on all worker log tables for this farm
  useEffect(() => {
    const handleInsert = (
      setter: React.Dispatch<React.SetStateAction<AnyRow[]>>,
      label: string,
    ) => (payload: any) => {
      const row = payload.new as AnyRow;
      if (!row || row.farm_id !== farmId) return;
      setter((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.id === row.id)) return prev;
        return [row, ...prev];
      });
      toast({
        title: `New ${label} report`,
        description: `${workerName(row.worker_id)} just submitted a log.`,
      });
    };

    const handleUpdate = (setter: React.Dispatch<React.SetStateAction<AnyRow[]>>) => (payload: any) => {
      const row = payload.new as AnyRow;
      if (!row || row.farm_id !== farmId) return;
      setter((prev) => prev.map((r) => (r.id === row.id ? row : r)));
    };

    const channel = supabase
      .channel(`farm-daily-${farmId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egg_production", filter: `farm_id=eq.${farmId}` }, handleInsert(setEggs, "egg production"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "egg_production", filter: `farm_id=eq.${farmId}` }, handleUpdate(setEggs))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_usage", filter: `farm_id=eq.${farmId}` }, handleInsert(setFeed, "feed usage"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "feed_usage", filter: `farm_id=eq.${farmId}` }, handleUpdate(setFeed))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mortality", filter: `farm_id=eq.${farmId}` }, handleInsert(setMortality, "mortality"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mortality", filter: `farm_id=eq.${farmId}` }, handleUpdate(setMortality))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vaccination", filter: `farm_id=eq.${farmId}` }, handleInsert(setVacc, "vaccination"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vaccination", filter: `farm_id=eq.${farmId}` }, handleUpdate(setVacc))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "worker_notes", filter: `farm_id=eq.${farmId}` }, handleInsert(setNotes, "note"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "worker_notes", filter: `farm_id=eq.${farmId}` }, handleUpdate(setNotes))
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, workers]);

  const totals = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    return {
      eggsToday: eggs.filter((e) => e.date === todayISO).reduce((s, r) => s + (Number(r.trays_collected) || 0), 0),
      feedToday: feed.filter((e) => e.date === todayISO).reduce((s, r) => s + (Number(r.quantity_used_kg) || 0), 0),
      deathsToday: mortality.filter((e) => e.date === todayISO).reduce((s, r) => s + (Number(r.number_dead) || 0), 0),
      vaccsToday: vacc.filter((e) => e.date === todayISO).length,
    };
  }, [eggs, feed, mortality, vacc]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Daily Worker Reports
              </CardTitle>
              <CardDescription>
                Live feed of operational logs from your team — updates instantly when workers submit data.
              </CardDescription>
            </div>
            <Badge variant={live ? "default" : "secondary"} className="shrink-0">
              <Wifi className={`w-3 h-3 mr-1 ${live ? "animate-pulse" : ""}`} />
              {live ? "Live" : "Connecting…"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <Stat icon={Egg} label="Trays today" value={totals.eggsToday.toLocaleString()} />
            <Stat icon={Package} label="Feed kg today" value={totals.feedToday.toLocaleString()} />
            <Stat icon={HeartCrack} label="Deaths today" value={totals.deathsToday.toLocaleString()} />
            <Stat icon={Syringe} label="Vaccinations today" value={totals.vaccsToday.toLocaleString()} />
          </div>

          <Tabs defaultValue="eggs" className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full sm:w-auto sm:inline-flex gap-1">
              <TabsTrigger value="eggs"><Egg className="w-3.5 h-3.5 mr-1" />Eggs</TabsTrigger>
              <TabsTrigger value="feed"><Package className="w-3.5 h-3.5 mr-1" />Feed</TabsTrigger>
              <TabsTrigger value="mortality"><HeartCrack className="w-3.5 h-3.5 mr-1" />Mortality</TabsTrigger>
              <TabsTrigger value="vacc"><Syringe className="w-3.5 h-3.5 mr-1" />Vaccines</TabsTrigger>
              <TabsTrigger value="notes"><FileText className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="eggs" className="mt-4">
              <ReportList rows={eggs} renderItem={(r) => (
                <Row
                  who={workerName(r.worker_id)}
                  when={r.date}
                  created={r.created_at}
                  primary={`${r.trays_collected} trays · ${r.eggs_per_tray}/tray`}
                  secondary={`${r.damaged_eggs ?? 0} damaged eggs · ${r.damaged_trays ?? 0} damaged trays`}
                />
              )} empty="No egg production logs in the last 30 days." />
            </TabsContent>

            <TabsContent value="feed" className="mt-4">
              <ReportList rows={feed} renderItem={(r) => (
                <Row
                  who={workerName(r.worker_id)}
                  when={r.date}
                  created={r.created_at}
                  primary={`${r.quantity_used_kg} kg ${r.feed_type}`}
                  secondary={`Stock left: ${r.remaining_stock_kg} kg`}
                />
              )} empty="No feed usage logs in the last 30 days." />
            </TabsContent>

            <TabsContent value="mortality" className="mt-4">
              <ReportList rows={mortality} renderItem={(r) => (
                <Row
                  who={workerName(r.worker_id)}
                  when={r.date}
                  created={r.created_at}
                  primary={`${r.number_dead} bird(s) · age ${r.age_weeks}w`}
                  secondary={`Cause: ${r.suspected_cause}`}
                  destructive
                />
              )} empty="No mortality logs in the last 30 days." />
            </TabsContent>

            <TabsContent value="vacc" className="mt-4">
              <ReportList rows={vacc} renderItem={(r) => (
                <Row
                  who={workerName(r.worker_id)}
                  when={r.date}
                  created={r.created_at}
                  primary={`${r.vaccine_name} · ${r.birds_vaccinated} birds`}
                  secondary={`Administered by ${r.administered_by}`}
                />
              )} empty="No vaccination logs in the last 30 days." />
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <ReportList rows={notes} renderItem={(r) => (
                <Row
                  who={workerName(r.worker_id)}
                  when={r.date}
                  created={r.created_at}
                  primary={r.notes}
                />
              )} empty="No notes in the last 30 days." />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-xl border bg-card p-3">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <p className="text-lg font-bold leading-tight">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

const Row = ({
  who, when, created, primary, secondary, destructive,
}: {
  who: string; when: string; created: string; primary: string; secondary?: string; destructive?: boolean;
}) => (
  <div className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${destructive ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}>
    <div className="min-w-0 flex-1">
      <p className="font-medium text-sm break-words">{primary}</p>
      {secondary && <p className="text-xs text-muted-foreground mt-0.5 break-words">{secondary}</p>}
      <p className="text-[11px] text-muted-foreground mt-1">
        by <span className="font-medium text-foreground">{who}</span> · {fmtDate(when)} · logged {fmtTime(created)}
      </p>
    </div>
  </div>
);

const ReportList = ({
  rows, renderItem, empty,
}: {
  rows: AnyRow[]; renderItem: (r: AnyRow) => React.ReactNode; empty: string;
}) => {
  if (rows.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">{empty}</p>;
  }
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
      {rows.map((r) => (
        <div key={r.id}>{renderItem(r)}</div>
      ))}
    </div>
  );
};

export default FarmDailyReports;
