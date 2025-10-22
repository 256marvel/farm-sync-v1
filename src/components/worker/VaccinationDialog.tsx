import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface VaccinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  farmId: string;
  onSuccess: () => void;
}

export const VaccinationDialog = ({ open, onOpenChange, workerId, farmId, onSuccess }: VaccinationDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vaccine_name: '',
    birds_vaccinated: '',
    administered_by: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("vaccination").insert({
        worker_id: workerId,
        farm_id: farmId,
        date: formData.date,
        vaccine_name: formData.vaccine_name,
        birds_vaccinated: parseInt(formData.birds_vaccinated),
        administered_by: formData.administered_by,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vaccination data recorded successfully",
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        vaccine_name: '',
        birds_vaccinated: '',
        administered_by: '',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Vaccination</DialogTitle>
          <DialogDescription>Enter vaccination details</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vaccine_name">Vaccine Name *</Label>
            <Input
              id="vaccine_name"
              type="text"
              value={formData.vaccine_name}
              onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
              placeholder="e.g., Newcastle Disease Vaccine"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birds_vaccinated">Birds Vaccinated *</Label>
              <Input
                id="birds_vaccinated"
                type="number"
                min="0"
                value={formData.birds_vaccinated}
                onChange={(e) => setFormData({ ...formData, birds_vaccinated: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="administered_by">Administered By *</Label>
              <Input
                id="administered_by"
                type="text"
                value={formData.administered_by}
                onChange={(e) => setFormData({ ...formData, administered_by: e.target.value })}
                placeholder="Name of person"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
