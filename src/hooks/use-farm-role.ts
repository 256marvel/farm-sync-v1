import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FarmRole =
  | "owner"
  | "manager"
  | "assistant_manager"
  | "caretaker"
  | "accountant"
  | "worker"
  | null;

/**
 * Returns the current user's role on a given farm.
 * Owners are detected via the farms.owner_id column; everyone else via workers.role.
 */
export const useFarmRole = (userId: string | undefined, farmId: string | undefined) => {
  const [role, setRole] = useState<FarmRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !farmId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      const { data, error } = await supabase.rpc("get_user_farm_role", {
        _user_id: userId,
        _farm_id: farmId,
      });
      if (cancelled) return;
      if (error) {
        setRole(null);
      } else {
        setRole((data as FarmRole) ?? null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, farmId]);

  return { role, loading };
};

/**
 * Permission helper:
 *  - Owner & Accountant: see ALL salaries.
 *  - Manager / Assistant Manager / Caretaker: see only regular worker salaries.
 *  - Anyone else: see no salaries.
 */
export const canSeeSalary = (
  viewerRole: FarmRole,
  targetRole: string | null | undefined,
): boolean => {
  if (!viewerRole) return false;
  if (viewerRole === "owner" || viewerRole === "accountant") return true;
  if (
    viewerRole === "manager" ||
    viewerRole === "assistant_manager" ||
    viewerRole === "caretaker"
  ) {
    return targetRole === "worker";
  }
  return false;
};
