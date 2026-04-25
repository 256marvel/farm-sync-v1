import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import {
  CATEGORIES_BY_KIND,
  PAYMENT_METHODS,
  type TxCategory,
  type TxKind,
} from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  farmId: string;
  userId: string;
  defaultKind?: TxKind;
  onSuccess?: () => void;
}

const AddTransactionDialog = ({ open, onOpenChange, farmId, userId, defaultKind = "income", onSuccess }: Props) => {
  const { toast } = useToast();
  const [kind, setKind] = useState<TxKind>(defaultKind);
  const [category, setCategory] = useState<TxCategory>(CATEGORIES_BY_KIND[defaultKind][0].value);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKind(defaultKind);
      setCategory(CATEGORIES_BY_KIND[defaultKind][0].value);
      setAmount("");
      setDescription("");
      setReference("");
      setPaymentMethod("Cash");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultKind]);

  useEffect(() => {
    // Reset category when kind switches
    setCategory(CATEGORIES_BY_KIND[kind][0].value);
  }, [kind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (!numeric || numeric <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("farm_transactions").insert({
      farm_id: farmId,
      recorded_by: userId,
      date,
      kind,
      category,
      amount: numeric,
      description: description.trim() || null,
      payment_method: paymentMethod || null,
      reference: reference.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Transaction recorded successfully." });
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            Log income, expenses or losses for this farm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <ToggleGroup
              type="single"
              value={kind}
              onValueChange={(v) => v && setKind(v as TxKind)}
              className="grid grid-cols-3 gap-2"
            >
              <ToggleGroupItem value="income" className="data-[state=on]:bg-secondary/15 data-[state=on]:text-secondary">
                <TrendingUp className="w-4 h-4 mr-1.5" /> Income
              </ToggleGroupItem>
              <ToggleGroupItem value="expense" className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive">
                <TrendingDown className="w-4 h-4 mr-1.5" /> Expense
              </ToggleGroupItem>
              <ToggleGroupItem value="loss" className="data-[state=on]:bg-amber-500/15 data-[state=on]:text-amber-600">
                <AlertTriangle className="w-4 h-4 mr-1.5" /> Loss
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TxCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_BY_KIND[kind].map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (UGX)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="100"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reference / Receipt no. (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. INV-001" />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief details..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
