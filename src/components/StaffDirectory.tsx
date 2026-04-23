import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Phone, Search, User as UserIcon, Users as UsersIcon, Home } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { canSeeSalary, type FarmRole } from "@/hooks/use-farm-role";
import { formatRole, formatUGX } from "@/lib/format";

type Worker = Database["public"]["Tables"]["workers"]["Row"];

interface StaffDirectoryProps {
  farmId: string;
  viewerRole: FarmRole;
  /** Optional title override */
  title?: string;
  description?: string;
}

const ROLE_FILTERS = ["all", "worker", "caretaker", "manager", "assistant_manager", "accountant"] as const;

const StaffDirectory = ({ farmId, viewerRole, title, description }: StaffDirectoryProps) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<typeof ROLE_FILTERS[number]>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("workers")
        .select("*")
        .eq("farm_id", farmId)
        .eq("is_active", true)
        .order("role", { ascending: true })
        .order("full_name", { ascending: true });
      if (!cancelled) {
        setWorkers(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter((w) => {
      if (roleFilter !== "all" && w.role !== roleFilter) return false;
      if (!q) return true;
      const hay = [w.full_name, w.contact_phone, w.house_assignment, w.role].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [workers, search, roleFilter]);

  const totalPayroll = useMemo(
    () =>
      filtered.reduce(
        (sum, w) => (canSeeSalary(viewerRole, w.role) && w.monthly_salary ? sum + Number(w.monthly_salary) : sum),
        0,
      ),
    [filtered, viewerRole],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              {title ?? "Employee Directory"}
            </CardTitle>
            <CardDescription>
              {description ?? "All active staff at this farm with their assignments."}
            </CardDescription>
          </div>
          {(viewerRole === "owner" || viewerRole === "accountant") && totalPayroll > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Visible monthly payroll</p>
              <p className="text-lg font-bold text-primary">{formatUGX(totalPayroll)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, role, house..."
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
                  {r === "all" ? "All roles" : formatRole(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No employees match your filters.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>House / Job Area</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Monthly Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => {
                  const allowed = canSeeSalary(viewerRole, w.role);
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{w.full_name}</p>
                            <p className="text-xs text-muted-foreground">{w.gender} · {w.age} yrs</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{formatRole(w.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        {w.house_assignment ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Home className="w-3.5 h-3.5 text-muted-foreground" />
                            {w.house_assignment}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {w.contact_phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {w.contact_phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {allowed ? (
                          w.monthly_salary != null ? (
                            <span className="font-semibold">{formatUGX(Number(w.monthly_salary))}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                            <Lock className="w-3 h-3" /> Restricted
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffDirectory;
