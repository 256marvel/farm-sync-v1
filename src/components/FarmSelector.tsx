import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, Plus, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface FarmSelectorProps {
  onFarmSelect: (farm: Farm) => void;
  onCreateFarm: () => void;
}

const FarmSelector = ({ onFarmSelect, onCreateFarm }: FarmSelectorProps) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
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
      setFarms(data || []);
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
        {farms.map((farm, index) => (
          <Card
            key={farm.id}
            className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all hover:scale-105 animate-fade-in group"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => onFarmSelect(farm)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sprout className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary/10 text-secondary capitalize">
                  {farm.farm_type.replace("_", " ")}
                </span>
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
        ))}
      </div>
    </div>
  );
};

export default FarmSelector;
