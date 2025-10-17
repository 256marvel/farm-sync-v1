import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Worker = Database["public"]["Tables"]["workers"]["Row"];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["caretaker", "manager", "assistant_manager", "accountant", "worker"]),
  gender: z.enum(["male", "female", "other"]),
  age: z.string().min(1, "Age is required"),
  contact_phone: z.string().optional(),
  nin: z.string().optional(),
  next_of_kin_name: z.string().min(2, "Next of kin name is required"),
  next_of_kin_relationship: z.enum(["parent", "sibling", "spouse", "child", "relative", "friend"]),
  next_of_kin_phone: z.string().min(10, "Valid phone number is required"),
  is_active: z.boolean(),
}).refine((data) => {
  const rolesRequiringNIN = ["caretaker", "manager", "assistant_manager", "accountant"];
  if (rolesRequiringNIN.includes(data.role) && !data.nin) {
    return false;
  }
  return true;
}, {
  message: "NIN is required for Caretaker, Manager, Assistant Manager, and Accountant roles",
  path: ["nin"],
});

interface EditWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
  onSuccess: () => void;
}

const EditWorkerDialog = ({ open, onOpenChange, worker, onSuccess }: EditWorkerDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      role: "worker",
      gender: "male",
      age: "",
      contact_phone: "",
      nin: "",
      next_of_kin_name: "",
      next_of_kin_relationship: "parent",
      next_of_kin_phone: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (worker) {
      form.reset({
        full_name: worker.full_name,
        role: worker.role,
        gender: worker.gender as "male" | "female" | "other",
        age: worker.age.toString(),
        contact_phone: worker.contact_phone || "",
        nin: worker.nin || "",
        next_of_kin_name: worker.next_of_kin_name,
        next_of_kin_relationship: worker.next_of_kin_relationship as any,
        next_of_kin_phone: worker.next_of_kin_phone,
        is_active: worker.is_active ?? true,
      });
    }
  }, [worker, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!worker) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("workers")
        .update({
          full_name: values.full_name,
          role: values.role,
          gender: values.gender,
          age: parseInt(values.age),
          contact_phone: values.contact_phone || null,
          nin: values.nin || null,
          next_of_kin_name: values.next_of_kin_name,
          next_of_kin_relationship: values.next_of_kin_relationship,
          next_of_kin_phone: values.next_of_kin_phone,
          is_active: values.is_active,
        })
        .eq("id", worker.id);

      if (error) throw error;

      toast({
        title: "Worker updated successfully! ✅",
        description: "Changes have been saved",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating worker",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Worker</DialogTitle>
          <DialogDescription>
            Update worker information and status
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role/Title *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="caretaker">Caretaker</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    National ID (NIN) {["caretaker", "manager", "assistant_manager", "accountant"].includes(form.watch("role")) && "*"}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter NIN" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Next of Kin Information</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="next_of_kin_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next of Kin Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_of_kin_relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="relative">Relative</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_of_kin_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next of Kin Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +256700000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
    </Dialog>
  );
};

export default EditWorkerDialog;
