import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users as UsersIcon, TrendingUp, Egg, Package, Briefcase, Wallet, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import StaffDirectory from "./StaffDirectory";
import FarmFinances from "./finance/FarmFinances";
import FarmInventory from "./inventory/FarmInventory";
import FarmInsights from "./insights/FarmInsights";
import FarmDailyReports from "./staff/FarmDailyReports";
import SyncStatusPanel from "./SyncStatusPanel";
import { formatRole } from "@/lib/format";
import { useT } from "@/lib/i18n";
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
  const t = useT();
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
        toast({ title: t("Error loading dashboard"), description: e.message, variant: "destructive" });
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
    return <div className="text-center py-12 text-muted-foreground">{t("Unable to load dashboard.")}</div>;
  }

  const titles: Record<string, string> = {
    manager: t("Manager Dashboard"),
    assistant_manager: t("Assistant Manager Dashboard"),
    caretaker: t("Caretaker Dashboard"),
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-1">{titles[role] ?? t("Staff Dashboard")}</h2>
        <p className="text-sm sm:text-base text-muted-foreground">{farm.name} · {farm.location_district}</p>
        <Badge className="capitalize bg-primary/15 text-primary hover:bg-primary/20 mt-3">
          <Briefcase className="w-3 h-3 mr-1" /> {formatRole(worker.role)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={UsersIcon} label={t("Active Workers")} value={`${stats.active} / ${stats.total}`} />
        <Stat icon={Egg} label={t("Trays this month")} value={stats.monthTrays.toLocaleString()} />
        <Stat icon={Package} label={t("Feed kg this month")} value={stats.monthFeedKg.toLocaleString()} />
        <Stat icon={TrendingUp} label={t("Farm Capacity")} value={(farm.bird_capacity ?? 0).toLocaleString()} />
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList aria-label={t("Dashboard sections")} className="grid grid-cols-5 w-full gap-1 h-auto p-1">
          <TabsTrigger value="reports" aria-label={t("Reports")} className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 py-2 px-1 text-[11px] sm:text-sm">
            <FileText className="w-4 h-4" aria-hidden="true" /> {t("Reports")}
          </TabsTrigger>
          <TabsTrigger value="team" aria-label={t("Team")} className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 py-2 px-1 text-[11px] sm:text-sm">
            <UsersIcon className="w-4 h-4" aria-hidden="true" /> {t("Team")}
          </TabsTrigger>
          <TabsTrigger value="finances" aria-label={t("Finances")} className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 py-2 px-1 text-[11px] sm:text-sm">
            <Wallet className="w-4 h-4" aria-hidden="true" /> {t("Finances")}
          </TabsTrigger>
          <TabsTrigger value="inventory" aria-label={t("Inventory")} className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 py-2 px-1 text-[11px] sm:text-sm">
            <Package className="w-4 h-4" aria-hidden="true" /> {t("Inventory")}
          </TabsTrigger>
          <TabsTrigger value="insights" aria-label={t("AI Insights")} className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 py-2 px-1 text-[11px] sm:text-sm">
            <Sparkles className="w-4 h-4" aria-hidden="true" /> {t("AI")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <SyncStatusPanel farmId={farm.id} />
          <FarmDailyReports farmId={farm.id} />
        </TabsContent>
        <TabsContent value="team" className="mt-4 sm:mt-6">
          <StaffDirectory farmId={farm.id} viewerRole={role} />
        </TabsContent>
        <TabsContent value="finances" className="mt-4 sm:mt-6">
          <FarmFinances farmId={farm.id} userId={userId} canDelete={false} canAdd={true} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4 sm:mt-6">
          <FarmInventory farmId={farm.id} userId={userId} canManage={true} />
        </TabsContent>
        <TabsContent value="insights" className="mt-4 sm:mt-6">
          <FarmInsights farmId={farm.id} />
        </TabsContent>
      </Tabs>
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
