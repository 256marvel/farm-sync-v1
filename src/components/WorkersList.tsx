import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Users as UsersIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Worker = Database["public"]["Tables"]["workers"]["Row"];

interface WorkersListProps {
  workers: Worker[];
  loading: boolean;
  onRefresh: () => void;
}

const WorkersList = ({ workers, loading }: WorkersListProps) => {
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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Next of Kin</TableHead>
            <TableHead>Status</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WorkersList;
