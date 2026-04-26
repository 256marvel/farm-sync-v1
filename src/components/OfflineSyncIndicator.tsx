import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudUpload, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { flushQueue, installAutoSync, subscribePending } from "@/lib/offline-queue";
import { useToast } from "@/hooks/use-toast";

const OfflineSyncIndicator = () => {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine !== false : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

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
    const unsub = subscribePending((count) => setPending(count));
    installAutoSync((result) => {
      if (result.synced > 0) {
        toast({
          title: `Synced ${result.synced} log${result.synced === 1 ? "" : "s"}`,
          description: "Queued reports were uploaded successfully.",
        });
      }
      if (result.dropped > 0) {
        toast({
          title: `${result.dropped} queued log${result.dropped === 1 ? "" : "s"} couldn't be saved`,
          description: "They were rejected by the server. Please re-enter them.",
          variant: "destructive",
        });
      }
    });
    return () => unsub();
  }, [toast]);

  const handleManualSync = async () => {
    if (!online || pending === 0 || syncing) return;
    setSyncing(true);
    try {
      const r = await flushQueue();
      if (r.synced > 0) {
        toast({ title: `Synced ${r.synced} log${r.synced === 1 ? "" : "s"}` });
      } else if (r.remaining > 0) {
        toast({ title: "Still pending", description: `${r.remaining} log(s) couldn't sync yet.` });
      }
    } finally {
      setSyncing(false);
    }
  };

  // Hidden when fully synced and online — keeps header clean.
  if (online && pending === 0) {
    return (
      <Badge
        variant="outline"
        className="hidden sm:inline-flex items-center gap-1 text-secondary border-secondary/30 bg-secondary/10"
        title="Online & synced"
      >
        <Check className="w-3 h-3" />
        <span>Synced</span>
      </Badge>
    );
  }

  if (!online) {
    return (
      <Badge
        variant="outline"
        className="inline-flex items-center gap-1 text-accent-foreground border-accent/40 bg-accent/15"
        title="You're offline. Logs will sync automatically when you reconnect."
      >
        <WifiOff className="w-3 h-3" />
        <span className="hidden xs:inline sm:inline">Offline</span>
        {pending > 0 && <span className="font-semibold">· {pending}</span>}
      </Badge>
    );
  }

  // Online with pending items
  return (
    <button
      type="button"
      onClick={handleManualSync}
      disabled={syncing}
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium hover:bg-primary/15 transition-colors"
      title="Click to sync now"
    >
      {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
      <span className="hidden xs:inline sm:inline">{syncing ? "Syncing" : "Sync"}</span>
      <span className="font-semibold">{pending}</span>
    </button>
  );
};

export default OfflineSyncIndicator;
