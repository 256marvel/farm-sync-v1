import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users as UsersIcon, TrendingUp, Egg, Package, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import StaffDirectory from "./StaffDirectory";
import { formatRole } from "@/lib/format";
import type { FarmRole } from "@/hooks/use-farm-role";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface StaffDashboardProps {
  userId: string;
  /** Senior staff role: manager / assistant_manager / caretaker */
  role: Exclude<FarmRole, "owner" | "accountant" | "worker" | null>;
}

const StaffDashboard = ({ userId, role }: StaffDashboardProps) => {
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [stats, setStats] = useState({ active: 0, total: 0, monthTrays: 0, monthFeedKg: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: w, error: we } = await supabase.from("workers").select("*").eq("user_id", userId).single();
        if (we) throw we;
        setWorker(w);

        const { data: f, error: fe } = await supabase.from("farms").select("*").eq("id", w.farm_id).single();
        if (fe) throw fe;
        setFarm(f);

        // Aggregate farm-wide stats for current month
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const startISO = start.toISOString().slice(0, 10);

        const [allWorkers, eggs, feed] = await Promise.all([
          supabase.from("workers").select("id, is_active").eq("farm_id", w.farm_id),
          supabase.from("egg_production").select("trays_collected").eq("farm_id", w.farm_id).gte("date", startISO),
          supabase.from("feed_usage").select("quantity_used_kg").eq("farm_id", w.farm_id).gte("date", startISO),
        ]);

        setStats({
          active: (allWorkers.data || []).filter((x) => x.is_active).length,
          total: (allWorkers.data || []).length,
          monthTrays: (eggs.data || []).reduce((s, r) => s + (Number(r.trays_collected) || 0), 0),
          monthFeedKg: (feed.data || []).reduce((s, r) => s + (Number(r.quantity_used_kg) || 0), 0),
        });
      } catch (e: any) {
        toast({ title: "Error loading dashboard", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!worker || !farm) {
    return <div className="text-center py-12 text-muted-foreground">Unable to load dashboard.</div>;
  }

  const titles: Record<string, string> = {
    manager: "Manager Dashboard",
    assistant_manager: "Assistant Manager Dashboard",
    caretaker: "Caretaker Dashboard",
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border p-6">
        <h2 className="text-3xl font-bold mb-1">{titles[role] ?? "Staff Dashboard"}</h2>
        <p className="text-muted-foreground">{farm.name} · {farm.location_district}</p>
        <Badge className="capitalize bg-primary/15 text-primary hover:bg-primary/20 mt-3">
          <Briefcase className="w-3 h-3 mr-1" /> {formatRole(worker.role)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={UsersIcon} label="Active Workers" value={`${stats.active} / ${stats.total}`} />
        <Stat icon={Egg} label="Trays this month" value={stats.monthTrays.toLocaleString()} />
        <Stat icon={Package} label="Feed kg this month" value={stats.monthFeedKg.toLocaleString()} />
        <Stat icon={TrendingUp} label="Farm Capacity" value={(farm.bird_capacity ?? 0).toLocaleString()} />
      </div>

      <StaffDirectory farmId={farm.id} viewerRole={role} />
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

export default StaffDashboard;
