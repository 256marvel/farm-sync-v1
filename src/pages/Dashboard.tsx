import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sprout, LogOut, Settings } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import FarmSelector from "@/components/FarmSelector";
import CreateFarmDialog from "@/components/CreateFarmDialog";
import FarmView from "@/components/FarmView";
import SettingsDialog from "@/components/SettingsDialog";
import WorkerDashboard from "@/components/WorkerDashboard";
import StaffDashboard from "@/components/StaffDashboard";
import AccountantDashboard from "@/components/AccountantDashboard";

type Farm = Database["public"]["Tables"]["farms"]["Row"];
type WorkerRole = Database["public"]["Enums"]["worker_role"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [createFarmOpen, setCreateFarmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workerRole, setWorkerRole] = useState<WorkerRole | null>(null);
  const [isWorker, setIsWorker] = useState(false);

  useEffect(() => {
    const checkUserRole = async (userId: string) => {
      const { data: workerData } = await supabase
        .from("workers")
        .select("id, is_active, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (workerData && workerData.is_active === false) {
        await supabase.auth.signOut();
        toast({
          title: "Account deactivated",
          description: "Your account has been deactivated. Please contact your farm owner.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setIsWorker(!!workerData);
      setWorkerRole((workerData?.role as WorkerRole) ?? null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkUserRole(session.user.id);
      } else {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkUserRole(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out successfully", description: "See you soon!" });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error signing out", description: error.message, variant: "destructive" });
    }
  };

  const handleFarmCreated = () => setRefreshKey((prev) => prev + 1);
  const handleFarmSelect = (farm: Farm) => setSelectedFarm(farm);
  const handleBackToFarms = () => setSelectedFarm(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <Sprout className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  // Decide which dashboard to render for staff/worker users
  const renderStaffOrWorkerView = () => {
    if (!user) return null;
    if (workerRole === "worker") return <WorkerDashboard userId={user.id} />;
    if (workerRole === "accountant") return <AccountantDashboard userId={user.id} />;
    if (workerRole === "manager" || workerRole === "assistant_manager" || workerRole === "caretaker") {
      return <StaffDashboard userId={user.id} role={workerRole} />;
    }
    // Fallback
    return <WorkerDashboard userId={user.id} />;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">FarmSync</h1>
                <p className="text-xs text-muted-foreground">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isWorker ? (
          renderStaffOrWorkerView()
        ) : selectedFarm ? (
          <FarmView farm={selectedFarm} onBack={handleBackToFarms} />
        ) : (
          <>
            <div className="mb-8 animate-slide-up">
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "Farmer"}! 👋
              </h2>
              <p className="text-muted-foreground">Manage your farms and track operations</p>
            </div>

            <FarmSelector
              key={refreshKey}
              onFarmSelect={handleFarmSelect}
              onCreateFarm={() => setCreateFarmOpen(true)}
            />
          </>
        )}
      </main>

      <CreateFarmDialog
        open={createFarmOpen}
        onOpenChange={setCreateFarmOpen}
        onSuccess={handleFarmCreated}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </div>
  );
};

export default Dashboard;
