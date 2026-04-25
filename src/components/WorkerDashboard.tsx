import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  MapPin,
  User,
  Egg,
  Package,
  AlertTriangle,
  Syringe,
  FileText,
  Home,
  Wallet,
  Briefcase,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { EggProductionDialog } from "./worker/EggProductionDialog";
import { FeedUsageDialog } from "./worker/FeedUsageDialog";
import { MortalityDialog } from "./worker/MortalityDialog";
import { VaccinationDialog } from "./worker/VaccinationDialog";
import { NotesDialog } from "./worker/NotesDialog";
import WorkerMonthlyRecords from "./worker/WorkerMonthlyRecords";
import { formatRole, formatUGX } from "@/lib/format";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type Farm = Database["public"]["Tables"]["farms"]["Row"];

interface WorkerDashboardProps {
  userId: string;
}

const WorkerDashboard = ({ userId }: WorkerDashboardProps) => {
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
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

      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (workerError) throw workerError;
      setWorker(workerData);

      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .select("*")
        .eq("id", workerData.farm_id)
        .single();
      if (farmError) throw farmError;
      setFarm(farmData);
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
    setRefreshKey((prev) => prev + 1);
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
      {/* Welcome Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border p-4 sm:p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">
              Welcome, {worker.full_name.split(" ")[0]} 👋
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">{farm.name} · {farm.location_district}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge className="capitalize bg-primary/15 text-primary hover:bg-primary/20">
                <Briefcase className="w-3 h-3 mr-1" /> {formatRole(worker.role)}
              </Badge>
              {worker.house_assignment && (
                <Badge variant="outline">
                  <Home className="w-3 h-3 mr-1" /> {worker.house_assignment}
                </Badge>
              )}
            </div>
          </div>
          {worker.monthly_salary != null && (
            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                <Wallet className="w-3.5 h-3.5" /> My Monthly Salary
              </div>
              <p className="text-xl sm:text-2xl font-bold text-primary">{formatUGX(Number(worker.monthly_salary))}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Record Today's Work</CardTitle>
          <CardDescription>Log your daily farm operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <ActionButton icon={Egg} label="Egg Production" onClick={() => setEggDialogOpen(true)} />
            <ActionButton icon={Package} label="Feed Usage" onClick={() => setFeedDialogOpen(true)} />
            <ActionButton icon={AlertTriangle} label="Mortality" onClick={() => setMortalityDialogOpen(true)} />
            <ActionButton icon={Syringe} label="Vaccination" onClick={() => setVaccinationDialogOpen(true)} />
            <ActionButton icon={FileText} label="Notes" onClick={() => setNotesDialogOpen(true)} />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Records */}
      <WorkerMonthlyRecords workerId={worker.id} refreshKey={refreshKey} />

      {/* Profile + Farm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" /> My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Full Name" value={worker.full_name} />
            <Field label="Login Email" value={worker.auto_generated_username} mono />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age" value={`${worker.age} yrs`} />
              <Field label="Gender" value={worker.gender} capitalize />
            </div>
            {worker.contact_phone && <Field label="Phone" value={worker.contact_phone} />}
            {worker.contact_address && <Field label="Address" value={worker.contact_address} />}
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Next of Kin</p>
              <p className="font-medium">{worker.next_of_kin_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {worker.next_of_kin_relationship} · {worker.next_of_kin_phone}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" /> Farm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-lg font-bold">{farm.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" value={farm.farm_type.replace("_", " ")} capitalize />
              <Field label="District" value={farm.location_district} />
            </div>
            {farm.bird_capacity && <Field label="Bird Capacity" value={farm.bird_capacity.toLocaleString()} />}
            {farm.description && <Field label="About" value={farm.description} />}
          </CardContent>
        </Card>
      </div>

      <EggProductionDialog open={eggDialogOpen} onOpenChange={setEggDialogOpen} workerId={worker.id} farmId={farm.id} onSuccess={handleDataEntrySuccess} />
      <FeedUsageDialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen} workerId={worker.id} farmId={farm.id} onSuccess={handleDataEntrySuccess} />
      <MortalityDialog open={mortalityDialogOpen} onOpenChange={setMortalityDialogOpen} workerId={worker.id} farmId={farm.id} onSuccess={handleDataEntrySuccess} />
      <VaccinationDialog open={vaccinationDialogOpen} onOpenChange={setVaccinationDialogOpen} workerId={worker.id} farmId={farm.id} onSuccess={handleDataEntrySuccess} />
      <NotesDialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen} workerId={worker.id} farmId={farm.id} onSuccess={handleDataEntrySuccess} />
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <Button
    variant="outline"
    className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5 transition-all"
    onClick={onClick}
  >
    <Icon className="w-6 h-6 text-primary" />
    <span className="text-xs font-medium">{label}</span>
  </Button>
);

const Field = ({
  label,
  value,
  capitalize,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
  mono?: boolean;
}) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`font-medium ${capitalize ? "capitalize" : ""} ${mono ? "font-mono text-xs" : ""}`}>
      {value || "—"}
    </p>
  </div>
);

export default WorkerDashboard;
