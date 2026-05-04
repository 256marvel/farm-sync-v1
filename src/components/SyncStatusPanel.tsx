import { useEffect, useState } from "react";
import { CloudUpload, Check, Loader2, WifiOff, Wifi, RefreshCw, AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  flushQueue,
  subscribeSyncStatus,
  type SyncStatus,
} from "@/lib/offline-queue";
import {
  subscribeConflicts,
  clearConflicts,
  type ConflictEntry,
} from "@/lib/conflict-log";
import { useToast } from "@/hooks/use-toast";

interface SyncStatusPanelProps {
  /** Limit display to a single farm (e.g. on FarmView). Omit to show all farms the user can see. */
  farmId?: string;
}

interface FarmRow {
  id: string;
  name: string;
}

const formatRelative = (ts: number | null): string => {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 0) return "Just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

const SyncStatusPanel = ({ farmId }: SyncStatusPanelProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [farms, setFarms] = useState<FarmRow[]>([]);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine !== false : true,
  );
  const [syncing, setSyncing] = useState(false);
  const [, tick] = useState(0);

  // Live "x mins ago" — re-render every 30s.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeSyncStatus((s) => setStatus(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchFarms = async () => {
      let q = supabase.from("farms").select("id, name").eq("is_active", true);
      if (farmId) q = q.eq("id", farmId);
      const { data } = await q;
      if (data) setFarms(data as FarmRow[]);
    };
    fetchFarms();
  }, [farmId]);

  const handleSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const r = await flushQueue();
      if (r.synced > 0) {
        toast({ title: `Synced ${r.synced} log${r.synced === 1 ? "" : "s"}` });
      } else if (r.remaining > 0) {
        toast({ title: "Still pending", description: `${r.remaining} log(s) couldn't sync yet.` });
      } else {
        toast({ title: "All caught up", description: "Nothing to sync." });
      }
    } finally {
      setSyncing(false);
    }
  };

  const visibleFarms = farms;
  const totalPending = visibleFarms.reduce(
    (sum, f) => sum + (status?.pendingByFarm[f.id] ?? 0),
    0,
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-primary" />
              Sync Status
            </CardTitle>
            <CardDescription>
              Queued worker logs and last successful sync per farm
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {online ? (
              <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10">
                <Wifi className="w-3 h-3 mr-1" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-accent-foreground border-accent/40 bg-accent/15">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={!online || syncing || totalPending === 0}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-1.5">Sync now</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleFarms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No farms to display.</p>
        ) : (
          visibleFarms.map((farm) => {
            const pending = status?.pendingByFarm[farm.id] ?? 0;
            const lastSync = status?.lastSyncByFarm[farm.id] ?? null;
            return (
              <div
                key={farm.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{farm.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Last sync: <span className="font-medium text-foreground">{formatRelative(lastSync)}</span>
                  </p>
                </div>
                {pending > 0 ? (
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20 shrink-0">
                    <CloudUpload className="w-3 h-3 mr-1" />
                    {pending} pending
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10 shrink-0">
                    <Check className="w-3 h-3 mr-1" /> Synced
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default SyncStatusPanel;
