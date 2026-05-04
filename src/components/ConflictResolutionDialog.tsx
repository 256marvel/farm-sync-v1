import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export interface ConflictField {
  label: string;
  mine: string;
  theirs: string;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Display name shown above the diff (e.g. farm or record name). */
  recordLabel?: string;
  /** Who saved the latest server version, if known. */
  theirAuthor?: string;
  /** When the server version was last updated (ISO string). */
  theirUpdatedAt?: string;
  fields: ConflictField[];
  /** Resolve by overwriting the server's version with the user's edits. */
  onKeepMine: () => void;
  /** Resolve by discarding the user's edits and reloading the server version. */
  onKeepTheirs: () => void;
}

const formatStamp = (iso?: string) => {
  if (!iso) return "just now";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const ConflictResolutionDialog = ({
  open,
  onOpenChange,
  title = "Edit conflict",
  recordLabel,
  theirAuthor,
  theirUpdatedAt,
  fields,
  onKeepMine,
  onKeepTheirs,
}: ConflictResolutionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-accent-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {recordLabel ? <span className="font-medium text-foreground">{recordLabel}</span> : null}
            {recordLabel ? " was " : "This record was "}
            updated by{" "}
            <span className="font-medium text-foreground">{theirAuthor ?? "another user"}</span> at{" "}
            <span className="font-medium text-foreground">{formatStamp(theirUpdatedAt)}</span>{" "}
            while you were offline. Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Your version</Badge>
            {fields.map((f) => (
              <DiffRow key={`mine-${f.label}`} label={f.label} value={f.mine} highlight={f.mine !== f.theirs} />
            ))}
          </div>
          <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
            <Badge variant="outline">Server version</Badge>
            {fields.map((f) => (
              <DiffRow key={`theirs-${f.label}`} label={f.label} value={f.theirs} highlight={f.mine !== f.theirs} />
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onKeepTheirs}>
            Keep server version
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary text-white"
            onClick={onKeepMine}
          >
            Overwrite with mine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DiffRow = ({ label, value, highlight }: { label: string; value: string; highlight: boolean }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-medium break-words ${highlight ? "text-foreground" : "text-muted-foreground"}`}>
      {value || "—"}
    </p>
  </div>
);

export default ConflictResolutionDialog;
