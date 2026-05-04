import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Plus, TrendingUp, BarChart3, Sprout, Wallet, Package, Sparkles, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import CreateWorkerDialog from "./CreateWorkerDialog";
import WorkersList from "./WorkersList";
import StaffDirectory from "./StaffDirectory";
import FarmFinances from "./finance/FarmFinances";
import FarmInventory from "./inventory/FarmInventory";
import FarmInsights from "./insights/FarmInsights";
import FarmDailyReports from "./staff/FarmDailyReports";
import SyncStatusPanel from "./SyncStatusPanel";

type Farm = Database["public"]["Tables"]["farms"]["Row"];
type Worker = Database["public"]["Tables"]["workers"]["Row"];

interface FarmViewProps {
  farm: Farm;
  onBack: () => void;
}

const FarmView = ({ farm, onBack }: FarmViewProps) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [createWorkerOpen, setCreateWorkerOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [monthNet, setMonthNet] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    fetchWorkers();
    fetchMonthFinance();
  }, [farm.id]);

  const fetchMonthFinance = async () => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const startISO = start.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("farm_transactions")
      .select("kind, amount")
      .eq("farm_id", farm.id)
      .gte("date", startISO);
    if (data) {
      const net = data.reduce((sum, t) => {
        const a = Number(t.amount);
        if (t.kind === "income") return sum + a;
        return sum - a;
      }, 0);
      setMonthNet(net);
    }
  };

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("farm_id", farm.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading workers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeCount = workers.filter((w) => w.is_active).length;
  const totalPayroll = workers
    .filter((w) => w.is_active)
    .reduce((s, w) => s + (w.monthly_salary ? Number(w.monthly_salary) : 0), 0);
  const formattedPayroll = new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(totalPayroll);

  const formattedNet = monthNet === null ? "—" : new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(monthNet);

  const quickStats = [
    { label: "Active Workers", value: `${activeCount} / ${workers.length}`, icon: Users, color: "from-primary to-primary/80" },
    { label: "Monthly Payroll", value: formattedPayroll, icon: Wallet, color: "from-secondary to-secondary/80" },
    { label: "Net Profit (this month)", value: formattedNet, icon: BarChart3, color: monthNet !== null && monthNet < 0 ? "from-destructive to-destructive/80" : "from-accent to-accent/80" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-xl shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold truncate">{farm.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {farm.location_district} • {farm.farm_type.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {quickStats.map((stat, index) => (
          <Card
            key={index}
            className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-base sm:text-xl font-bold text-right break-words">{stat.value}</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top-level tabs */}
      <Tabs defaultValue="workers" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full sm:w-auto sm:inline-flex gap-1">
          <TabsTrigger value="workers">
            <Users className="w-4 h-4 mr-1.5" /> Workers
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-1.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="finances">
            <Wallet className="w-4 h-4 mr-1.5" /> Finances
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-1.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="w-4 h-4 mr-1.5" /> AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">Farm Workers</CardTitle>
                  <CardDescription>Manage your team and view the employee directory</CardDescription>
                </div>
                <Button
                  onClick={() => setCreateWorkerOpen(true)}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Worker
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manage">
                <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex">
                  <TabsTrigger value="manage">Management</TabsTrigger>
                  <TabsTrigger value="directory">Directory</TabsTrigger>
                </TabsList>
                <TabsContent value="manage" className="mt-4">
                  <WorkersList workers={workers} loading={loading} onRefresh={fetchWorkers} />
                </TabsContent>
                <TabsContent value="directory" className="mt-4">
                  <StaffDirectory farmId={farm.id} viewerRole="owner" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <SyncStatusPanel farmId={farm.id} />
          <FarmDailyReports farmId={farm.id} />
        </TabsContent>

        <TabsContent value="finances" className="mt-4 sm:mt-6">
          {userId ? (
            <FarmFinances farmId={farm.id} userId={userId} canDelete={true} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading finances...</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-4 sm:mt-6">
          {userId ? (
            <FarmInventory farmId={farm.id} userId={userId} canManage={true} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading inventory...</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="mt-4 sm:mt-6">
          <FarmInsights farmId={farm.id} />
        </TabsContent>
      </Tabs>

      <CreateWorkerDialog
        open={createWorkerOpen}
        onOpenChange={setCreateWorkerOpen}
        farmId={farm.id}
        onSuccess={fetchWorkers}
      />
    </div>
  );
};

export default FarmView;
