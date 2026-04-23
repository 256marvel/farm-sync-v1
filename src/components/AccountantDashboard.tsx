import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Users as UsersIcon, Building2, ArrowLeft, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import StaffDirectory from "./StaffDirectory";
import { formatUGX, formatRole } from "@/lib/format";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface AccountantDashboardProps {
  userId: string;
}

const AccountantDashboard = ({ userId }: AccountantDashboardProps) => {
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
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

        const { data: list, error: le } = await supabase
          .from("workers")
          .select("*")
          .eq("farm_id", w.farm_id)
          .eq("is_active", true);
        if (le) throw le;
        setAllWorkers(list || []);
      } catch (e: any) {
        toast({ title: "Error loading payroll data", description: e.message, variant: "destructive" });
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

  const totalPayroll = allWorkers.reduce(
    (s, w) => s + (w.monthly_salary ? Number(w.monthly_salary) : 0),
    0,
  );
  const setSalaries = allWorkers.filter((w) => w.monthly_salary != null).length;
  const unsetSalaries = allWorkers.length - setSalaries;

  // Group by role for breakdown
  const byRole: Record<string, { count: number; total: number }> = {};
  allWorkers.forEach((w) => {
    if (!byRole[w.role]) byRole[w.role] = { count: 0, total: 0 };
    byRole[w.role].count += 1;
    if (w.monthly_salary) byRole[w.role].total += Number(w.monthly_salary);
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-1">Accountant Dashboard</h2>
            <p className="text-muted-foreground">{farm.name} · Payroll & Staff Finance</p>
            <Badge className="capitalize bg-primary/15 text-primary hover:bg-primary/20 mt-3">
              <Briefcase className="w-3 h-3 mr-1" /> {formatRole(worker.role)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Payroll Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Wallet}
          label="Total Monthly Payroll"
          value={formatUGX(totalPayroll)}
          color="from-primary to-primary/80"
        />
        <StatCard
          icon={UsersIcon}
          label="Active Staff"
          value={`${allWorkers.length}`}
          color="from-secondary to-secondary/80"
        />
        <StatCard
          icon={Building2}
          label="Salaries Configured"
          value={`${setSalaries} / ${allWorkers.length}`}
          subtitle={unsetSalaries > 0 ? `${unsetSalaries} pending` : "All set"}
          color="from-accent to-accent/80"
        />
      </div>

      {/* Payroll breakdown by role */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll by Role</CardTitle>
          <CardDescription>Monthly outlay grouped by job position</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byRole)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([role, info]) => (
                <div key={role} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{formatRole(role)}</Badge>
                    <span className="text-sm text-muted-foreground">{info.count} staff</span>
                  </div>
                  <span className="font-mono font-semibold">{formatUGX(info.total)}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Full directory — accountant sees ALL salaries */}
      <StaffDirectory
        farmId={farm.id}
        viewerRole="accountant"
        title="Full Payroll Register"
        description="All employees with monthly salaries — accountant view."
      />
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) => (
  <Card className="border-border/50 hover:border-primary/50 transition-all">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default AccountantDashboard;
