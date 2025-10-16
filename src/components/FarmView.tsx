import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Plus, TrendingUp, BarChart3, Sprout } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import CreateWorkerDialog from "./CreateWorkerDialog";
import WorkersList from "./WorkersList";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
  }, [farm.id]);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("farm_id", farm.id)
        .eq("is_active", true)
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

  const quickStats = [
    { label: "Team Members", value: workers.length.toString(), icon: Users, color: "from-primary to-primary/80" },
    { label: "This Month", value: "0 trays", icon: TrendingUp, color: "from-secondary to-secondary/80" },
    { label: "Reports", value: "0", icon: BarChart3, color: "from-accent to-accent/80" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{farm.name}</h1>
              <p className="text-muted-foreground">
                {farm.location_district} • {farm.farm_type.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => (
          <Card
            key={index}
            className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Farm Workers</CardTitle>
              <CardDescription>Manage your team members</CardDescription>
            </div>
            <Button
              onClick={() => setCreateWorkerOpen(true)}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Worker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <WorkersList workers={workers} loading={loading} onRefresh={fetchWorkers} />
        </CardContent>
      </Card>

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
