import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, LANGUAGES, type LanguageCode } from "@/lib/i18n";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SupabaseUser | null;
}

const SettingsDialog = ({ open, onOpenChange, user }: SettingsDialogProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const updates: any = {};

      // Update full name if changed
      if (fullName && fullName !== user?.user_metadata?.full_name) {
        updates.data = { full_name: fullName };
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        updates.password = newPassword;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;

        // Update profile table if name changed
        if (updates.data?.full_name) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", user?.id);
        }

        toast({
          title: "Profile updated successfully! ✅",
          description: "Your changes have been saved",
        });

        // If password was changed, sign out and redirect to login
        if (updates.password) {
          await supabase.auth.signOut();
          toast({
            title: "Password changed",
            description: "Please sign in with your new password",
          });
          navigate("/auth");
        } else {
          onOpenChange(false);
        }
      } else {
        toast({
          title: "No changes made",
          description: "Update your information to save changes",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("Account Settings")}</DialogTitle>
          <DialogDescription>
            {t("Update your profile information and password")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("Email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">{t("Email cannot be changed")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("Full Name")}
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("Enter your full name")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              {t("Language")}
            </Label>
            <Select value={lang} onValueChange={(v) => setLang(v as LanguageCode)}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.native} {l.code !== "en" && <span className="text-muted-foreground text-xs">· {l.label}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("Choose your preferred language")}</p>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t("Change Password")}
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("New Password")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("Enter new password")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("Confirm Password")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("Confirm new password")}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
          >
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("Save Changes")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
