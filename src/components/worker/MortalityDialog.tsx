import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MortalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  farmId: string;
  onSuccess: () => void;
}

export const MortalityDialog = ({ open, onOpenChange, workerId, farmId, onSuccess }: MortalityDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    number_dead: '',
    suspected_cause: '',
    age_weeks: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("mortality").insert({
        worker_id: workerId,
        farm_id: farmId,
        date: formData.date,
        number_dead: parseInt(formData.number_dead),
        suspected_cause: formData.suspected_cause,
        age_weeks: parseInt(formData.age_weeks),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mortality data recorded successfully",
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        number_dead: '',
        suspected_cause: '',
        age_weeks: '',
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
          <DialogTitle>Record Mortality</DialogTitle>
          <DialogDescription>Enter mortality data for today</DialogDescription>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number_dead">Number of Birds Dead *</Label>
              <Input
                id="number_dead"
                type="number"
                min="0"
                value={formData.number_dead}
                onChange={(e) => setFormData({ ...formData, number_dead: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age_weeks">Age (Weeks) *</Label>
              <Input
                id="age_weeks"
                type="number"
                min="0"
                value={formData.age_weeks}
                onChange={(e) => setFormData({ ...formData, age_weeks: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suspected_cause">Suspected Cause *</Label>
            <Textarea
              id="suspected_cause"
              value={formData.suspected_cause}
              onChange={(e) => setFormData({ ...formData, suspected_cause: e.target.value })}
              placeholder="Describe the suspected cause of death..."
              required
              disabled={isLoading}
              rows={3}
            />
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
