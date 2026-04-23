import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  User,
  Phone,
  Users as UsersIcon,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  PowerOff,
  Power,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import EditWorkerDialog from "./EditWorkerDialog";

type Worker = Database["public"]["Tables"]["workers"]["Row"];

interface WorkersListProps {
  workers: Worker[];
  loading: boolean;
  onRefresh: () => void;
}

const ROLE_FILTERS = ["all", "worker", "caretaker", "manager", "assistant_manager", "accountant"] as const;
const STATUS_FILTERS = ["all", "active", "inactive"] as const;

const WorkersList = ({ workers, loading, onRefresh }: WorkersListProps) => {
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);
  const [toggleWorker, setToggleWorker] = useState<Worker | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<typeof ROLE_FILTERS[number]>("all");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const togglePasswordVisibility = (workerId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteWorker) return;

    try {
      // Delete the worker record. The auth account is preserved so the
      // login email cannot be re-used until cleanup, but the row is gone.
      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", deleteWorker.id);

      if (error) throw error;

      toast({
        title: "Worker deleted successfully",
        description: "The worker has been removed from the system",
      });

      onRefresh();
      setDeleteWorker(null);
    } catch (error: any) {
      toast({
        title: "Error deleting worker",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async () => {
    if (!toggleWorker) return;
    const nextActive = !toggleWorker.is_active;
    setBusyId(toggleWorker.id);

    try {
      const { error } = await supabase
        .from("workers")
        .update({ is_active: nextActive })
        .eq("id", toggleWorker.id);

      if (error) throw error;

      toast({
        title: nextActive ? "Worker reactivated" : "Worker deactivated",
        description: nextActive
          ? `${toggleWorker.full_name} can sign in again.`
          : `${toggleWorker.full_name} can no longer sign in.`,
      });

      onRefresh();
      setToggleWorker(null);
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter((w) => {
      if (roleFilter !== "all" && w.role !== roleFilter) return false;
      if (statusFilter === "active" && !w.is_active) return false;
      if (statusFilter === "inactive" && w.is_active) return false;
      if (!q) return true;
      const haystack = [
        w.full_name,
        w.auto_generated_username,
        w.contact_phone,
        w.next_of_kin_name,
        w.contact_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [workers, search, roleFilter, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
          <UsersIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No workers yet</h3>
        <p className="text-muted-foreground">
          Add your first worker to start managing your farm operations
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r === "all" ? "All roles" : r.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>House</TableHead>
              <TableHead>Salary (UGX)</TableHead>
              <TableHead>Login Email</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No workers match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkers.map((worker) => (
                <TableRow key={worker.id} className={worker.is_active ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{worker.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {worker.gender} · {worker.age} yrs
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {worker.role?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {worker.house_assignment ? (
                      <span className="text-sm">{worker.house_assignment}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {worker.monthly_salary != null
                      ? Number(worker.monthly_salary).toLocaleString()
                      : <span className="text-muted-foreground text-sm">Not set</span>}
                  </TableCell>
                  <TableCell>
                    {worker.auto_generated_username ? (
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono max-w-[160px] truncate">
                          {worker.auto_generated_username}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(worker.auto_generated_username!, `email-${worker.id}`)}
                        >
                          {copiedField === `email-${worker.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {worker.auto_generated_password ? (
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {visiblePasswords.has(worker.id) ? worker.auto_generated_password : "••••••••"}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(worker.id)}
                        >
                          {visiblePasswords.has(worker.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(worker.auto_generated_password!, `pw-${worker.id}`)}
                        >
                          {copiedField === `pw-${worker.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {worker.contact_phone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {worker.contact_phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={worker.is_active ? "default" : "secondary"}
                      className={worker.is_active ? "bg-secondary" : ""}
                    >
                      {worker.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setToggleWorker(worker)}
                        disabled={busyId === worker.id}
                        title={worker.is_active ? "Deactivate" : "Reactivate"}
                        className={worker.is_active ? "" : "text-secondary"}
                      >
                        {worker.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditWorker(worker)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteWorker(worker)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditWorkerDialog
        open={!!editWorker}
        onOpenChange={(open) => !open && setEditWorker(null)}
        worker={editWorker}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteWorker} onOpenChange={(open) => !open && setDeleteWorker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteWorker?.full_name}? This action cannot be undone.
              Their worker ID will be available for reassignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toggleWorker} onOpenChange={(open) => !open && setToggleWorker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleWorker?.is_active ? "Deactivate worker?" : "Reactivate worker?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleWorker?.is_active
                ? `${toggleWorker?.full_name} will no longer be able to sign in. You can reactivate them at any time.`
                : `${toggleWorker?.full_name} will be able to sign in again with their existing credentials.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive}>
              {toggleWorker?.is_active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WorkersList;
