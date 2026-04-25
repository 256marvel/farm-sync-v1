import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  Search,
  Trash2,
  Receipt,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatUGX, monthKey, monthLabel } from "@/lib/format";
import {
  formatCategory,
  KIND_META,
  type FarmTransaction,
  type TxKind,
} from "@/lib/finance";
import AddTransactionDialog from "./AddTransactionDialog";

interface Props {
  farmId: string;
  userId: string;
  /** owner & accountant can add and (owner/accountant) delete; staff can view & add but not delete */
  canDelete: boolean;
  /** Hide "Add" button for read-only viewers */
  canAdd?: boolean;
}

const KIND_FILTERS: ("all" | TxKind)[] = ["all", "income", "expense", "loss"];

const FarmFinances = ({ farmId, userId, canDelete, canAdd = true }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<FarmTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [defaultKind, setDefaultKind] = useState<TxKind>("income");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<FarmTransaction | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("farm_transactions")
        .select("*")
        .eq("farm_id", farmId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (error) {
          toast({ title: "Error loading finances", description: error.message, variant: "destructive" });
        } else {
          setItems(data || []);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId, refreshKey, toast]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((t) => set.add(monthKey(t.date)));
    return Array.from(set).sort().reverse();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (monthFilter !== "all" && monthKey(t.date) !== monthFilter) return false;
      if (!q) return true;
      const hay = [t.category, t.description, t.reference, t.payment_method, String(t.amount)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, kindFilter, monthFilter]);

  const totals = useMemo(() => {
    const t = { income: 0, expense: 0, loss: 0 };
    filtered.forEach((x) => {
      t[x.kind] += Number(x.amount);
    });
    return { ...t, net: t.income - t.expense - t.loss };
  }, [filtered]);

  // This-month KPIs (always calendar month, not filtered)
  const thisMonth = useMemo(() => {
    const key = monthKey(new Date());
    const t = { income: 0, expense: 0, loss: 0 };
    items.forEach((x) => {
      if (monthKey(x.date) === key) t[x.kind] += Number(x.amount);
    });
    return { ...t, net: t.income - t.expense - t.loss, label: monthLabel(key) };
  }, [items]);

  const breakdownByCategory = useMemo(() => {
    const grouped: Record<string, { kind: TxKind; total: number; count: number }> = {};
    filtered.forEach((t) => {
      const k = `${t.kind}:${t.category}`;
      if (!grouped[k]) grouped[k] = { kind: t.kind, total: 0, count: 0 };
      grouped[k].total += Number(t.amount);
      grouped[k].count += 1;
    });
    return Object.entries(grouped)
      .map(([key, v]) => ({ key, category: key.split(":")[1], ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const handleAddClick = (k: TxKind) => {
    setDefaultKind(k);
    setOpenAdd(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("farm_transactions").delete().eq("id", pendingDelete.id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Transaction removed." });
      setRefreshKey((k) => k + 1);
    }
    setPendingDelete(null);
  };

  const exportCsv = () => {
    const header = ["Date", "Type", "Category", "Amount (UGX)", "Payment", "Reference", "Description"];
    const rows = filtered.map((t) => [
      t.date,
      t.kind,
      formatCategory(t.category),
      String(t.amount),
      t.payment_method ?? "",
      t.reference ?? "",
      (t.description ?? "").replace(/\n/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farm-finances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* This Month KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">{thisMonth.label} Summary</CardTitle>
              <CardDescription>Live totals for the current calendar month</CardDescription>
            </div>
            {canAdd && (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleAddClick("income")} className="border-secondary/40 text-secondary hover:bg-secondary/10">
                  <Plus className="w-4 h-4 mr-1" /> Income
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddClick("expense")} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                  <Plus className="w-4 h-4 mr-1" /> Expense
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAddClick("loss")} className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400">
                  <Plus className="w-4 h-4 mr-1" /> Loss
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiTile icon={TrendingUp} label="Income" value={formatUGX(thisMonth.income)} tone="secondary" />
            <KpiTile icon={TrendingDown} label="Expenses" value={formatUGX(thisMonth.expense)} tone="destructive" />
            <KpiTile icon={AlertTriangle} label="Losses" value={formatUGX(thisMonth.loss)} tone="amber" />
            <KpiTile
              icon={Wallet}
              label="Net Profit"
              value={formatUGX(thisMonth.net)}
              tone={thisMonth.net >= 0 ? "primary" : "destructive"}
              highlight
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Transactions
              </CardTitle>
              <CardDescription>
                {filtered.length} of {items.length} entries · Net for selection:{" "}
                <span className={totals.net >= 0 ? "text-secondary font-semibold" : "text-destructive font-semibold"}>
                  {formatUGX(totals.net)}
                </span>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search description, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_FILTERS.map((k) => (
                  <SelectItem key={k} value={k} className="capitalize">
                    {k === "all" ? "All types" : KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {monthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection totals (visible on small + large) */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <MiniTotal label="Income" value={totals.income} tone="secondary" />
            <MiniTotal label="Expenses" value={totals.expense} tone="destructive" />
            <MiniTotal label="Losses" value={totals.loss} tone="amber" />
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No transactions yet. Click an Add button above to record your first entry.</p>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="grid gap-2 md:hidden">
                {filtered.map((t) => (
                  <div key={t.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <KindBadge kind={t.kind} />
                          <span className="text-sm font-medium truncate">{formatCategory(t.category)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(t.date).toLocaleDateString()} · {t.payment_method ?? "—"}
                        </p>
                        {t.description && <p className="text-xs mt-1 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono font-bold text-sm ${KIND_META[t.kind].tone}`}>
                          {t.kind === "income" ? "+" : "-"}
                          {formatUGX(Number(t.amount))}
                        </p>
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 mt-1 text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDelete(t)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {canDelete && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <KindBadge kind={t.kind} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCategory(t.category)}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm">{t.description ?? "—"}</div>
                          {t.reference && (
                            <div className="text-xs text-muted-foreground">Ref: {t.reference}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{t.payment_method ?? "—"}</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${KIND_META[t.kind].tone}`}>
                          {t.kind === "income" ? "+" : "-"}
                          {formatUGX(Number(t.amount))}
                        </TableCell>
                        {canDelete && (
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setPendingDelete(t)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Breakdown by category */}
      {breakdownByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Breakdown by Category</CardTitle>
            <CardDescription>For the current filter selection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdownByCategory.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <KindBadge kind={row.kind} />
                    <span className="text-sm font-medium truncate">{formatCategory(row.category as any)}</span>
                    <span className="text-xs text-muted-foreground">· {row.count}</span>
                  </div>
                  <span className={`font-mono font-semibold whitespace-nowrap ${KIND_META[row.kind].tone}`}>
                    {formatUGX(row.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AddTransactionDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        farmId={farmId}
        userId={userId}
        defaultKind={defaultKind}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry from your records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const TONE_BG: Record<string, string> = {
  secondary: "bg-secondary/10 text-secondary",
  destructive: "bg-destructive/10 text-destructive",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  primary: "bg-primary/10 text-primary",
};

const KpiTile = ({
  icon: Icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  tone: keyof typeof TONE_BG;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-xl border p-3 sm:p-4 ${highlight ? "ring-2 ring-primary/30 bg-gradient-to-br from-primary/5 to-background" : "bg-card"}`}
  >
    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2 ${TONE_BG[tone]}`}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
    </div>
    <p className="text-base sm:text-xl font-bold break-words leading-tight">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const MiniTotal = ({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONE_BG }) => (
  <div className={`rounded-md border p-2 text-center ${TONE_BG[tone]}`}>
    <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    <p className="text-xs sm:text-sm font-bold font-mono break-words">{formatUGX(value)}</p>
  </div>
);

const KindBadge = ({ kind }: { kind: TxKind }) => {
  const variants: Record<TxKind, string> = {
    income: "bg-secondary/15 text-secondary border-secondary/30",
    expense: "bg-destructive/15 text-destructive border-destructive/30",
    loss: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  };
  return (
    <Badge variant="outline" className={`${variants[kind]} capitalize`}>
      {KIND_META[kind].label}
    </Badge>
  );
};

export default FarmFinances;
