import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import ConflictResolutionDialog, { type ConflictField } from "./ConflictResolutionDialog";
import { recordConflict } from "@/lib/conflict-log";

type Farm = Database["public"]["Tables"]["farms"]["Row"];

const formSchema = z.object({
  name: z.string().min(2, "Farm name must be at least 2 characters"),
  farm_type: z.enum(["layers", "broilers", "dual_purpose"]),
  location_district: z.string().min(2, "District is required"),
  location_subcounty: z.string().optional(),
  location_parish: z.string().optional(),
  location_village: z.string().optional(),
  size_acres: z.string().optional(),
  bird_capacity: z.string().optional(),
  start_date: z.string(),
  description: z.string().optional(),
});

interface EditFarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farm: Farm | null;
  onSuccess: () => void;
}

const EditFarmDialog = ({ open, onOpenChange, farm, onSuccess }: EditFarmDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    fields: ConflictField[];
    serverRow: Farm;
    pendingValues: z.infer<typeof formSchema>;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      farm_type: "layers",
      location_district: "",
      location_subcounty: "",
      location_parish: "",
      location_village: "",
      size_acres: "",
      bird_capacity: "",
      start_date: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  useEffect(() => {
    if (farm) {
      setBaseUpdatedAt(farm.updated_at);
      form.reset({
        name: farm.name,
        farm_type: farm.farm_type as "layers" | "broilers" | "dual_purpose",
        location_district: farm.location_district,
        location_subcounty: farm.location_subcounty || "",
        location_parish: farm.location_parish || "",
        location_village: farm.location_village || "",
        size_acres: farm.size_acres?.toString() || "",
        bird_capacity: farm.bird_capacity?.toString() || "",
        start_date: farm.start_date,
        description: farm.description || "",
      });
    }
  }, [farm, form]);

  const buildPatch = (values: z.infer<typeof formSchema>) => ({
    name: values.name,
    farm_type: values.farm_type,
    location_district: values.location_district,
    location_subcounty: values.location_subcounty || null,
    location_parish: values.location_parish || null,
    location_village: values.location_village || null,
    size_acres: values.size_acres ? parseFloat(values.size_acres) : null,
    bird_capacity: values.bird_capacity ? parseInt(values.bird_capacity) : null,
    start_date: values.start_date,
    description: values.description || null,
  });

  /**
   * Compare submitted form values to the latest server row and build a
   * field-level diff for the conflict resolver. Only fields that actually
   * differ are surfaced.
   */
  const buildConflictFields = (
    values: z.infer<typeof formSchema>,
    server: Farm,
  ): ConflictField[] => {
    const rows: ConflictField[] = [
      { label: "Name", mine: values.name, theirs: server.name },
      { label: "Farm type", mine: values.farm_type, theirs: server.farm_type },
      { label: "District", mine: values.location_district, theirs: server.location_district },
      { label: "Subcounty", mine: values.location_subcounty || "", theirs: server.location_subcounty || "" },
      { label: "Parish", mine: values.location_parish || "", theirs: server.location_parish || "" },
      { label: "Village", mine: values.location_village || "", theirs: server.location_village || "" },
      { label: "Size (acres)", mine: values.size_acres || "", theirs: server.size_acres?.toString() || "" },
      { label: "Bird capacity", mine: values.bird_capacity || "", theirs: server.bird_capacity?.toString() || "" },
      { label: "Start date", mine: values.start_date, theirs: server.start_date },
      { label: "Description", mine: values.description || "", theirs: server.description || "" },
    ];
    return rows.filter((r) => r.mine !== r.theirs);
  };

  const performUpdate = async (values: z.infer<typeof formSchema>): Promise<{ ok: boolean; conflictRow?: Farm }> => {
    if (!farm) return { ok: false };
    // Optimistic-concurrency guard: only update when the row hasn't changed
    // since we loaded it. If `updated_at` no longer matches, the eq-filter
    // matches zero rows and we treat it as a conflict.
    const baseStamp = baseUpdatedAt ?? farm.updated_at;
    const { data, error } = await supabase
      .from("farms")
      .update(buildPatch(values))
      .eq("id", farm.id)
      .eq("updated_at", baseStamp)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Either someone else won the race or the row was deleted. Refetch.
      const { data: latest } = await supabase
        .from("farms")
        .select("*")
        .eq("id", farm.id)
        .maybeSingle();
      return { ok: false, conflictRow: (latest as Farm) ?? undefined };
    }
    return { ok: true };
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!farm) return;
    setIsSubmitting(true);
    try {
      const result = await performUpdate(values);
      if (result.ok) {
        toast({ title: "Farm updated ✅", description: "Your changes have been saved" });
        onOpenChange(false);
        onSuccess();
        return;
      }
      if (result.conflictRow) {
        const fields = buildConflictFields(values, result.conflictRow);
        if (fields.length === 0) {
          // Server row already matches our values — nothing to resolve.
          toast({ title: "Already up to date", description: "Server already had your changes." });
          onOpenChange(false);
          onSuccess();
          return;
        }
        setConflict({ fields, serverRow: result.conflictRow, pendingValues: values });
      } else {
        toast({
          title: "Record removed",
          description: "This farm was deleted by another user.",
          variant: "destructive",
        });
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error updating farm",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepMine = async () => {
    if (!conflict || !farm) return;
    setIsSubmitting(true);
    try {
      // Force overwrite using the now-known server stamp.
      const { error } = await supabase
        .from("farms")
        .update(buildPatch(conflict.pendingValues))
        .eq("id", farm.id);
      if (error) throw error;
      recordConflict({
        table: "farms",
        recordId: farm.id,
        farmId: farm.id,
        recordLabel: farm.name,
        resolution: "kept-mine",
      });
      toast({ title: "Your version saved", description: "Server changes were overwritten." });
      setConflict(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepTheirs = () => {
    if (!conflict || !farm) return;
    recordConflict({
      table: "farms",
      recordId: farm.id,
      farmId: farm.id,
      recordLabel: farm.name,
      resolution: "kept-theirs",
    });
    toast({ title: "Server version kept", description: "Your edits were discarded." });
    setConflict(null);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Farm</DialogTitle>
          <DialogDescription>Update your farm information</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="farm_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select farm type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="layers">Layers</SelectItem>
                      <SelectItem value="broilers">Broilers</SelectItem>
                      <SelectItem value="dual_purpose">Dual Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location_district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_subcounty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcounty</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_parish"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parish</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_village"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Village</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="size_acres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (Acres)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bird_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bird Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this farm..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      <ConflictResolutionDialog
        open={!!conflict}
        onOpenChange={(o) => { if (!o) setConflict(null); }}
        title="Farm edit conflict"
        recordLabel={farm?.name}
        theirUpdatedAt={conflict?.serverRow.updated_at}
        fields={conflict?.fields ?? []}
        onKeepMine={handleKeepMine}
        onKeepTheirs={handleKeepTheirs}
      />
    </Dialog>
  );
};

export default EditFarmDialog;
