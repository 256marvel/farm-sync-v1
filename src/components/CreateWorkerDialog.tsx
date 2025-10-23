import { useState } from "react";
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
import { Loader2, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

interface CreateWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  onSuccess: () => void;
}

const CreateWorkerDialog = ({ open, onOpenChange, farmId, onSuccess }: CreateWorkerDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
    },
  });

  const generateCredentials = async (fullName: string, farmName: string) => {
    // Get first name from full name
    const firstName = fullName.toLowerCase().split(' ')[0];
    
    // Get farm abbreviation (first 3 letters or full name if shorter)
    const farmAbbr = farmName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3);
    
    // Find next available ID number for this farm
    const { data: existingWorkers } = await supabase
      .from("workers")
      .select("auto_generated_username")
      .eq("farm_id", farmId)
      .like("auto_generated_username", `${firstName}_${farmAbbr}%`);
    
    // Extract numbers from existing usernames and find next available
    const existingNumbers = (existingWorkers || [])
      .map(w => {
        const match = w.auto_generated_username.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(n => n > 0);
    
    // Find the smallest available number starting from 1
    let idNumber = 1;
    while (existingNumbers.includes(idNumber)) {
      idNumber++;
    }
    
    const username = `${firstName}_${farmAbbr}${String(idNumber).padStart(3, '0')}`;
    
    // Generate password from first name + random numbers
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const password = `${firstName}${randomNum}`;
    
    return { username, password };
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get farm name for credential generation
      const { data: farm, error: farmError } = await supabase
        .from("farms")
        .select("name")
        .eq("id", farmId)
        .maybeSingle();

      if (farmError) throw farmError;
      if (!farm) throw new Error("Farm not found. Please try refreshing the page.");

      const creds = await generateCredentials(values.full_name, farm.name);

      // Create Supabase auth user for the worker
      const workerEmail = `${creds.username}@farmsync.local`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: workerEmail,
        password: creds.password,
        options: {
          data: {
            full_name: values.full_name,
            username: creds.username,
            is_worker: true,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create worker account");

      // Create worker record linked to auth user
      const { error } = await supabase.from("workers").insert({
        farm_id: farmId,
        manager_id: user.id,
        user_id: authData.user.id,
        full_name: values.full_name,
        role: values.role,
        gender: values.gender,
        age: parseInt(values.age),
        contact_phone: values.contact_phone || null,
        nin: values.nin || null,
        next_of_kin_name: values.next_of_kin_name,
        next_of_kin_relationship: values.next_of_kin_relationship,
        next_of_kin_phone: values.next_of_kin_phone,
        auto_generated_username: creds.username,
        auto_generated_password: creds.password,
      });

      if (error) throw error;

      setCredentials(creds);
      
      toast({
        title: "Worker added successfully! 🎉",
        description: "Login credentials have been generated",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error adding worker",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setCredentials(null);
    onOpenChange(false);
  };

  if (credentials) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Worker Credentials Generated ✅</DialogTitle>
            <DialogDescription>
              Save these credentials - they won't be shown again!
            </DialogDescription>
          </DialogHeader>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">Username</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-background rounded-lg border text-sm font-mono">
                    {credentials.username}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.username, "username")}
                  >
                    {copiedField === "username" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Password</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-background rounded-lg border text-sm font-mono">
                    {credentials.password}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.password, "password")}
                  >
                    {copiedField === "password" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Worker</DialogTitle>
          <DialogDescription>
            Login credentials will be auto-generated after creation
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                onClick={handleClose}
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
                Add Worker
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkerDialog;
