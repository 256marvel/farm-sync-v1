import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Briefcase, Wallet, Users as UsersIcon, Package, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import StaffDirectory from "./StaffDirectory";
import FarmFinances from "./finance/FarmFinances";
import FarmInventory from "./inventory/FarmInventory";
import FarmInsights from "./insights/FarmInsights";
import { formatRole } from "@/lib/format";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface AccountantDashboardProps {
  userId: string;
}

const AccountantDashboard = ({ userId }: AccountantDashboardProps) => {
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: w, error: we } = await supabase
          .from("workers")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (we) throw we;
        setWorker(w);

        const { data: f, error: fe } = await supabase.from("farms").select("*").eq("id", w.farm_id).single();
        if (fe) throw fe;
        setFarm(f);
      } catch (e: any) {
        toast({ title: "Error loading accountant data", description: e.message, variant: "destructive" });
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
    return <div className="text-center py-12 text-muted-foreground">Unable to load accountant data.</div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-1">Accountant Dashboard</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {farm.name} · {farm.location_district}
        </p>
        <Badge className="capitalize bg-primary/15 text-primary hover:bg-primary/20 mt-3">
          <Briefcase className="w-3 h-3 mr-1" /> {formatRole(worker.role)}
        </Badge>
      </div>

      <Tabs defaultValue="finances" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto sm:inline-flex gap-1">
          <TabsTrigger value="finances">
            <Wallet className="w-4 h-4 mr-1.5" /> Finances
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <UsersIcon className="w-4 h-4 mr-1.5" /> Payroll
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-1.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="w-4 h-4 mr-1.5" /> AI
          </TabsTrigger>
        </TabsList>
        <TabsContent value="finances" className="mt-4 sm:mt-6">
          <FarmFinances farmId={farm.id} userId={userId} canDelete={true} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4 sm:mt-6">
          <Card>
            <CardContent className="pt-6">
              <StaffDirectory
                farmId={farm.id}
                viewerRole="accountant"
                title="Full Payroll Register"
                description="All employees with monthly salaries — accountant view."
              />
            </CardContent>
          </Card>
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

export default AccountantDashboard;
