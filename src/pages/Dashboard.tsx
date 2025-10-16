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

type Farm = Database["public"]["Tables"]["farms"]["Row"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [createFarmOpen, setCreateFarmOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "See you soon!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFarmCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFarmSelect = (farm: Farm) => {
    setSelectedFarm(farm);
  };

  const handleBackToFarms = () => {
    setSelectedFarm(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <Sprout className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <Button variant="ghost" size="icon">
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
        {selectedFarm ? (
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
    </div>
  );
};

export default Dashboard;
