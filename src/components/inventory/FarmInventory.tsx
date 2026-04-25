import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["inventory_items"]["Row"];
type Category = Database["public"]["Enums"]["inventory_category"];
type MovementType = Database["public"]["Enums"]["inventory_movement_type"];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "feed", label: "Feed" },
  { value: "vaccine", label: "Vaccine" },
  { value: "medicine", label: "Medicine" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

interface Props {
  farmId: string;
  userId: string;
  canManage: boolean;
}

const FarmInventory = ({ farmId, userId, canManage }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [moveType, setMoveType] = useState<MovementType>("received");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("farm_id", farmId)
        .eq("is_active", true)
        .order("category")
        .order("name");
      if (!cancelled) {
        if (error) {
          toast({ title: "Error loading inventory", description: error.message, variant: "destructive" });
        } else {
          setItems(data || []);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [farmId, refreshKey, toast]);

  const lowStock = useMemo(
    () => items.filter((i) => Number(i.current_quantity) <= Number(i.low_stock_threshold) && Number(i.low_stock_threshold) > 0),
    [items],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5" /> Inventory
              </CardTitle>
              <CardDescription>
                Stock levels auto-update when workers log feed usage or vaccinations
              </CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setAddItemOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lowStock.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-400">Low stock alert</p>
                <p className="text-xs text-muted-foreground">
                  {lowStock.map((i) => i.name).join(", ")}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No inventory items yet.</p>
              {canManage && <p className="text-xs mt-1">Click "Add Item" to start tracking your stock.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => {
                const isLow = Number(item.current_quantity) <= Number(item.low_stock_threshold) && Number(item.low_stock_threshold) > 0;
                return (
                  <div key={item.id} className={`rounded-lg border p-3 bg-card ${isLow ? "ring-1 ring-amber-500/40" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.name}</p>
                        <Badge variant="outline" className="capitalize text-xs mt-1">
                          {item.category}
                        </Badge>
                      </div>
                      {isLow && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                    </div>
                    <p className="text-2xl font-bold font-mono">
                      {Number(item.current_quantity).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                    </p>
                    {Number(item.low_stock_threshold) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Low at {Number(item.low_stock_threshold).toLocaleString()} {item.unit}
                      </p>
                    )}
                    {canManage && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-secondary border-secondary/40 hover:bg-secondary/10"
                          onClick={() => { setMoveItem(item); setMoveType("received"); }}
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> Receive
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => { setMoveItem(item); setMoveType("used"); }}
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" /> Use
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        farmId={farmId}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <MovementDialog
        item={moveItem}
        movementType={moveType}
        onClose={() => setMoveItem(null)}
        farmId={farmId}
        userId={userId}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

const AddItemDialog = ({
  open, onOpenChange, farmId, onSuccess,
}: { open: boolean; onOpenChange: (v: boolean) => void; farmId: string; onSuccess: () => void }) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("feed");
  const [unit, setUnit] = useState("kg");
  const [initialQty, setInitialQty] = useState("0");
  const [lowAt, setLowAt] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setCategory("feed"); setUnit("kg"); setInitialQty("0"); setLowAt("0");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("inventory_items").insert({
      farm_id: farmId,
      name: name.trim(),
      category,
      unit: unit.trim() || "unit",
      current_quantity: Number(initialQty) || 0,
      low_stock_threshold: Number(lowAt) || 0,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not add item", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item added" });
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Tip: name feed/vaccine items exactly as workers log them so stock auto-deducts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Layer Feed" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg / dose / pcs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Starting Quantity</Label>
              <Input type="number" min="0" step="0.1" value={initialQty} onChange={(e) => setInitialQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Low Stock At</Label>
              <Input type="number" min="0" step="0.1" value={lowAt} onChange={(e) => setLowAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MovementDialog = ({
  item, movementType, onClose, farmId, userId, onSuccess,
}: {
  item: Item | null;
  movementType: MovementType;
  onClose: () => void;
  farmId: string;
  userId: string;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) { setQty(""); setNotes(""); }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const n = Number(qty);
    if (!n || n <= 0) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("inventory_movements").insert({
      farm_id: farmId,
      item_id: item.id,
      recorded_by: userId,
      movement_type: movementType,
      quantity: n,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Stock updated" });
    onSuccess();
    onClose();
  };

  const labels: Record<MovementType, string> = {
    received: "Receive Stock",
    used: "Record Usage",
    adjusted: "Adjust Stock",
    lost: "Record Loss",
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels[movementType]}: {item?.name}</DialogTitle>
          <DialogDescription>
            Current: {item ? Number(item.current_quantity).toLocaleString() : 0} {item?.unit}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Quantity ({item?.unit})</Label>
            <Input type="number" min="0" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Supplier name, reason..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FarmInventory;
