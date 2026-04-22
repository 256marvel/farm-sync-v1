import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sprout,
  Plus,
  MapPin,
  Calendar,
  Users,
  Pencil,
  Archive,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import EditFarmDialog from "./EditFarmDialog";

type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface FarmSelectorProps {
  onFarmSelect: (farm: Farm) => void;
  onCreateFarm: () => void;
}

interface FarmStats {
  total: number;
  active: number;
}

const FarmSelector = ({ onFarmSelect, onCreateFarm }: FarmSelectorProps) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);
  const [archiveFarm, setArchiveFarm] = useState<Farm | null>(null);
  const [stats, setStats] = useState<Record<string, FarmStats>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = data || [];
      setFarms(list);

      // Fetch worker counts in one query
      if (list.length > 0) {
        const { data: workersData } = await supabase
          .from("workers")
          .select("farm_id, is_active")
          .in("farm_id", list.map((f) => f.id));

        const counts: Record<string, FarmStats> = {};
        list.forEach((f) => {
          counts[f.id] = { total: 0, active: 0 };
        });
        (workersData || []).forEach((w) => {
          if (!counts[w.farm_id]) counts[w.farm_id] = { total: 0, active: 0 };
          counts[w.farm_id].total += 1;
          if (w.is_active) counts[w.farm_id].active += 1;
        });
        setStats(counts);
      } else {
        setStats({});
      }
    } catch (error: any) {
      toast({
        title: "Error loading farms",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveFarm) return;
    try {
      const { error } = await supabase
        .from("farms")
        .update({ is_active: false })
        .eq("id", archiveFarm.id);

      if (error) throw error;

      toast({
        title: "Farm archived",
        description: `${archiveFarm.name} has been archived. All historical data is preserved.`,
      });
      setArchiveFarm(null);
      fetchFarms();
    } catch (error: any) {
      toast({
        title: "Error archiving farm",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin">
          <Sprout className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
              <Sprout className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Create Your First Farm</h3>
            <p className="text-muted-foreground mb-6">
              Start managing your poultry operations by creating your first farm profile
            </p>
            <Button
              size="lg"
              onClick={onCreateFarm}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold px-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Farm
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Farms</h2>
          <p className="text-muted-foreground mt-1">Select a farm to manage</p>
        </div>
        <Button
          onClick={onCreateFarm}
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Farm
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farms.map((farm, index) => {
          const farmStats = stats[farm.id] ?? { total: 0, active: 0 };
          return (
            <Card
              key={farm.id}
              className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all hover:scale-105 animate-fade-in group relative"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => onFarmSelect(farm)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sprout className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary/10 text-secondary capitalize">
                      {farm.farm_type.replace("_", " ")}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFarm(farm);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit farm
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveFarm(farm);
                          }}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive farm
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2">{farm.name}</h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{farm.location_district}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Since {new Date(farm.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      <span className="font-semibold text-foreground">{farmStats.active}</span>
                      {" / "}
                      {farmStats.total} workers
                    </span>
                  </div>
                </div>

                {farm.bird_capacity && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm">
                      <span className="font-semibold text-primary">{farm.bird_capacity}</span> birds capacity
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EditFarmDialog
        open={!!editFarm}
        onOpenChange={(open) => !open && setEditFarm(null)}
        farm={editFarm}
        onSuccess={fetchFarms}
      />

      <AlertDialog open={!!archiveFarm} onOpenChange={(open) => !open && setArchiveFarm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this farm?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveFarm?.name} will be hidden from your dashboard. All workers, egg
              production, feed, mortality and other historical records are preserved
              and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FarmSelector;
