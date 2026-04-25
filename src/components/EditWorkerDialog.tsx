import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Database } from "@/integrations/supabase/types";

type Worker = Database["public"]["Tables"]["workers"]["Row"];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["caretaker", "manager", "assistant_manager", "accountant", "worker"]),
  gender: z.enum(["male", "female", "other"]),
  age: z.string().min(1, "Age is required"),
  date_of_birth: z.string().optional(),
  contact_address: z.string().optional(),
  contact_phone: z.string().optional(),
  nin: z.string().optional(),
  monthly_salary: z.string().optional(),
  house_assignment: z.string().optional(),
  is_also_accountant: z.boolean().optional(),
  next_of_kin_name: z.string().min(2, "Next of kin name is required"),
  next_of_kin_relationship: z.enum(["parent", "sibling", "spouse", "child", "relative", "friend"]),
  next_of_kin_phone: z.string().min(10, "Valid phone number is required"),
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
      date_of_birth: "",
      contact_address: "",
      contact_phone: "",
      nin: "",
      monthly_salary: "",
      house_assignment: "",
      is_also_accountant: false,
      next_of_kin_name: "",
      next_of_kin_relationship: "parent",
      next_of_kin_phone: "",
    },
  });

  useEffect(() => {
    if (worker) {
      form.reset({
        full_name: worker.full_name,
        role: worker.role,
        gender: worker.gender as "male" | "female" | "other",
        age: worker.age.toString(),
        date_of_birth: worker.date_of_birth || "",
        contact_address: worker.contact_address || "",
        contact_phone: worker.contact_phone || "",
        nin: worker.nin || "",
        monthly_salary: worker.monthly_salary != null ? String(worker.monthly_salary) : "",
        house_assignment: worker.house_assignment || "",
        next_of_kin_name: worker.next_of_kin_name,
        next_of_kin_relationship: worker.next_of_kin_relationship as any,
        next_of_kin_phone: worker.next_of_kin_phone,
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
          date_of_birth: values.date_of_birth || null,
          contact_address: values.contact_address || null,
          contact_phone: values.contact_phone || null,
          nin: values.nin || null,
          monthly_salary: values.monthly_salary ? Number(values.monthly_salary) : null,
          house_assignment: values.house_assignment || null,
          next_of_kin_name: values.next_of_kin_name,
          next_of_kin_relationship: values.next_of_kin_relationship,
          next_of_kin_phone: values.next_of_kin_phone,
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            <FormField
              control={form.control}
              name="contact_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Village, parish, district, etc."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
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

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Job & Compensation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="house_assignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House / Job Area</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., House A, Layer Pen 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthly_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Salary (UGX)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1000" placeholder="e.g., 350000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
