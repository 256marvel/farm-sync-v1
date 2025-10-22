import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EggProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  farmId: string;
  onSuccess: () => void;
}

export const EggProductionDialog = ({ open, onOpenChange, workerId, farmId, onSuccess }: EggProductionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    trays_collected: '',
    eggs_per_tray: '',
    damaged_trays: '0',
    damaged_eggs: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("egg_production").insert({
        worker_id: workerId,
        farm_id: farmId,
        date: formData.date,
        trays_collected: parseInt(formData.trays_collected),
        eggs_per_tray: parseInt(formData.eggs_per_tray),
        damaged_trays: parseInt(formData.damaged_trays),
        damaged_eggs: parseInt(formData.damaged_eggs),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Egg production data recorded successfully",
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        trays_collected: '',
        eggs_per_tray: '',
        damaged_trays: '0',
        damaged_eggs: '0',
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
          <DialogTitle>Record Egg Production</DialogTitle>
          <DialogDescription>Enter today's egg collection data</DialogDescription>
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
              <Label htmlFor="trays_collected">Trays Collected *</Label>
              <Input
                id="trays_collected"
                type="number"
                min="0"
                value={formData.trays_collected}
                onChange={(e) => setFormData({ ...formData, trays_collected: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eggs_per_tray">Eggs Per Tray *</Label>
              <Input
                id="eggs_per_tray"
                type="number"
                min="0"
                value={formData.eggs_per_tray}
                onChange={(e) => setFormData({ ...formData, eggs_per_tray: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="damaged_trays">Damaged Trays</Label>
              <Input
                id="damaged_trays"
                type="number"
                min="0"
                value={formData.damaged_trays}
                onChange={(e) => setFormData({ ...formData, damaged_trays: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="damaged_eggs">Damaged Eggs</Label>
              <Input
                id="damaged_eggs"
                type="number"
                min="0"
                value={formData.damaged_eggs}
                onChange={(e) => setFormData({ ...formData, damaged_eggs: e.target.value })}
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
