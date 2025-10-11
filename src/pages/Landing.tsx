import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sprout, Users, TrendingUp, Shield, Smartphone, Globe } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Multi-Role Management",
      description: "Owners, managers, caretakers, and workers—all in one system",
    },
    {
      icon: TrendingUp,
      title: "Smart Analytics",
      description: "AI-powered insights for poultry health and farm performance",
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "NIN validation and role-based access for maximum security",
    },
    {
      icon: Smartphone,
      title: "Works Offline",
      description: "Record data anywhere, sync when you're back online",
    },
    {
      icon: Globe,
      title: "Multilingual",
      description: "Full support for Luganda, Runyankole, Lusoga, and more",
    },
    {
      icon: Sprout,
      title: "Multi-Farm Ready",
      description: "Manage multiple farms from a single dashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/5" />
        
        {/* Animated Blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20">
              <Sprout className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Uganda's #1 Poultry Management System</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              FarmSync
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              The modern way to manage your poultry farm. Track production, manage teams, and grow smarter—even offline.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 px-8 py-6 text-lg rounded-xl"
              >
                Sign In
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              No credit card required • Setup in 2 minutes • Free trial
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">
              Everything You Need to
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Succeed</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built specifically for Ugandan poultry farmers with the features that matter most
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:scale-105 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8 p-12 rounded-3xl bg-card/50 backdrop-blur-sm border border-primary/20 shadow-2xl">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to Transform Your Farm?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join hundreds of farmers across Uganda managing their poultry operations with FarmSync
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold px-10 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 FarmSync. Built for Ugandan poultry farmers.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
