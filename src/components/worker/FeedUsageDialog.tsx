import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { enqueueOrInsert } from "@/lib/offline-queue";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

interface FeedUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  farmId: string;
  onSuccess: () => void;
}

export const FeedUsageDialog = ({ open, onOpenChange, workerId, farmId, onSuccess }: FeedUsageDialogProps) => {
  const { toast } = useToast();
  const t = useT();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    feed_type: '',
    quantity_used_kg: '',
    remaining_stock_kg: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { queued } = await enqueueOrInsert("feed_usage", {
        worker_id: workerId,
        farm_id: farmId,
        date: formData.date,
        feed_type: formData.feed_type,
        quantity_used_kg: parseFloat(formData.quantity_used_kg),
        remaining_stock_kg: parseFloat(formData.remaining_stock_kg),
      });

      toast({
        title: queued ? t("Saved offline") : t("Success"),
        description: queued
          ? t("You're offline. This feed usage will sync automatically when you reconnect.")
          : t("Feed usage data recorded successfully"),
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        feed_type: '',
        quantity_used_kg: '',
        remaining_stock_kg: '',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("Error"),
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
          <DialogTitle>{t("Record Feed Usage")}</DialogTitle>
          <DialogDescription>{t("Enter today's feed consumption data")}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">{t("Date")} *</Label>
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
            <Label htmlFor="feed_type">{t("Feed Type")} *</Label>
            <Select
              value={formData.feed_type}
              onValueChange={(value) => setFormData({ ...formData, feed_type: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Select feed type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Starter Feed">{t("Starter Feed")}</SelectItem>
                <SelectItem value="Grower Feed">{t("Grower Feed")}</SelectItem>
                <SelectItem value="Layer Feed">{t("Layer Feed")}</SelectItem>
                <SelectItem value="Broiler Feed">{t("Broiler Feed")}</SelectItem>
                <SelectItem value="Finisher Feed">{t("Finisher Feed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_used_kg">{t("Quantity Used (kg)")} *</Label>
              <Input
                id="quantity_used_kg"
                type="number"
                step="0.1"
                min="0"
                value={formData.quantity_used_kg}
                onChange={(e) => setFormData({ ...formData, quantity_used_kg: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remaining_stock_kg">{t("Remaining Stock (kg)")} *</Label>
              <Input
                id="remaining_stock_kg"
                type="number"
                step="0.1"
                min="0"
                value={formData.remaining_stock_kg}
                onChange={(e) => setFormData({ ...formData, remaining_stock_kg: e.target.value })}
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
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Save Record")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
