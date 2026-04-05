import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Phone, Users as UsersIcon, Pencil, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
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

const WorkersList = ({ workers, loading, onRefresh }: WorkersListProps) => {
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const togglePasswordVisibility = (workerId: string) => {
    setVisiblePasswords(prev => {
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
      // Delete the worker's auth account if they have one
      if (deleteWorker.user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(deleteWorker.user_id);
        if (authError) console.error("Error deleting auth user:", authError);
      }

      // Delete the worker record
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
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Login Email</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Next of Kin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{worker.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {worker.auto_generated_username}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {worker.role?.replace('_', ' ')}
                  </Badge>
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
                <TableCell className="capitalize">{worker.gender}</TableCell>
                <TableCell>{worker.age} years</TableCell>
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
                  <div className="text-sm">
                    <p className="font-medium">{worker.next_of_kin_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {worker.next_of_kin_relationship}
                    </p>
                  </div>
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
                      onClick={() => setEditWorker(worker)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteWorker(worker)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WorkersList;
