import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, MapPin, Calendar, Phone, User, Briefcase, Egg, Package, AlertTriangle, Syringe, FileText, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { EggProductionDialog } from "./worker/EggProductionDialog";
import { FeedUsageDialog } from "./worker/FeedUsageDialog";
import { MortalityDialog } from "./worker/MortalityDialog";
import { VaccinationDialog } from "./worker/VaccinationDialog";
import { NotesDialog } from "./worker/NotesDialog";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface WorkerDashboardProps {
  userId: string;
}

const WorkerDashboard = ({ userId }: WorkerDashboardProps) => {
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [coworkers, setCoworkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eggDialogOpen, setEggDialogOpen] = useState(false);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [mortalityDialogOpen, setMortalityDialogOpen] = useState(false);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchWorkerData();
  }, [userId]);

  const fetchWorkerData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch worker profile
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (workerError) throw workerError;
      setWorker(workerData);

      // Fetch farm data
      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .select("*")
        .eq("id", workerData.farm_id)
        .single();

      if (farmError) throw farmError;
      setFarm(farmData);

      // Fetch coworkers
      const { data: coworkersData, error: coworkersError } = await supabase
        .from("workers")
        .select("*")
        .eq("farm_id", workerData.farm_id)
        .eq("is_active", true)
        .neq("id", workerData.id);

      if (coworkersError) throw coworkersError;
      setCoworkers(coworkersData || []);

    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataEntrySuccess = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Data recorded",
      description: "Your entry has been saved successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!worker || !farm) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load worker information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          Welcome, {worker.full_name.split(" ")[0]}! 👋
        </h2>
        <p className="text-muted-foreground">Your work dashboard at {farm.name}</p>
      </div>

      {/* Quick Actions - Data Entry Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Record Daily Data</CardTitle>
          <CardDescription>Click to record your daily farm operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setEggDialogOpen(true)}
            >
              <Egg className="w-6 h-6" />
              <span className="text-sm">Egg Production</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setFeedDialogOpen(true)}
            >
              <Package className="w-6 h-6" />
              <span className="text-sm">Feed Usage</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setMortalityDialogOpen(true)}
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="text-sm">Mortality</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setVaccinationDialogOpen(true)}
            >
              <Syringe className="w-6 h-6" />
              <span className="text-sm">Vaccination</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setNotesDialogOpen(true)}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm">Notes</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Worker Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Profile
          </CardTitle>
          <CardDescription>Your personal information and role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{worker.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="secondary" className="capitalize">
                {worker.role.replace("_", " ")}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-medium">{worker.auto_generated_username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="font-medium">{worker.age} years</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium capitalize">{worker.gender}</p>
            </div>
            {worker.contact_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{worker.contact_phone}</p>
              </div>
            )}
            {worker.nin && (
              <div>
                <p className="text-sm text-muted-foreground">NIN</p>
                <p className="font-medium">{worker.nin}</p>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Next of Kin</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{worker.next_of_kin_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Relationship</p>
                <p className="font-medium capitalize">{worker.next_of_kin_relationship}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{worker.next_of_kin_phone}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farm Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Farm Details
          </CardTitle>
          <CardDescription>Information about your workplace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Farm Name</p>
            <p className="text-xl font-bold">{farm.name}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="outline" className="capitalize">
                {farm.farm_type.replace("_", " ")}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{farm.location_district}</p>
            </div>
            {farm.size_acres && (
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-medium">{farm.size_acres} acres</p>
              </div>
            )}
            {farm.bird_capacity && (
              <div>
                <p className="text-sm text-muted-foreground">Bird Capacity</p>
                <p className="font-medium">{farm.bird_capacity.toLocaleString()}</p>
              </div>
            )}
          </div>

          {farm.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{farm.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coworkers Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Team
          </CardTitle>
          <CardDescription>
            {coworkers.length} other {coworkers.length === 1 ? "worker" : "workers"} at this farm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coworkers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              You're the only worker registered at this farm
            </p>
          ) : (
            <div className="space-y-3">
              {coworkers.map((coworker) => (
                <div
                  key={coworker.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{coworker.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {coworker.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  {coworker.contact_phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{coworker.contact_phone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Entry Dialogs */}
      <EggProductionDialog
        open={eggDialogOpen}
        onOpenChange={setEggDialogOpen}
        workerId={worker.id}
        farmId={farm.id}
        onSuccess={handleDataEntrySuccess}
      />
      <FeedUsageDialog
        open={feedDialogOpen}
        onOpenChange={setFeedDialogOpen}
        workerId={worker.id}
        farmId={farm.id}
        onSuccess={handleDataEntrySuccess}
      />
      <MortalityDialog
        open={mortalityDialogOpen}
        onOpenChange={setMortalityDialogOpen}
        workerId={worker.id}
        farmId={farm.id}
        onSuccess={handleDataEntrySuccess}
      />
      <VaccinationDialog
        open={vaccinationDialogOpen}
        onOpenChange={setVaccinationDialogOpen}
        workerId={worker.id}
        farmId={farm.id}
        onSuccess={handleDataEntrySuccess}
      />
      <NotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        workerId={worker.id}
        farmId={farm.id}
        onSuccess={handleDataEntrySuccess}
      />
    </div>
  );
};

export default WorkerDashboard;
