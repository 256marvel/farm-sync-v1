import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sprout, Upload, Loader2, Trash2 } from "lucide-react";

interface FarmImageUploadProps {
  farmId: string;
  imageUrl: string | null;
  onChange: (url: string | null) => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

const MAX_BYTES = 5 * 1024 * 1024;

const FarmImageUpload = ({ farmId, imageUrl, onChange, size = "md" }: FarmImageUploadProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Image too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${farmId}/profile-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("farm-images")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("farm-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast({ title: "Farm image updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;
    setBusy(true);
    try {
      // Extract storage path after the bucket name
      const marker = "/farm-images/";
      const idx = imageUrl.indexOf(marker);
      if (idx >= 0) {
        const path = imageUrl.substring(idx + marker.length);
        await supabase.storage.from("farm-images").remove([path]);
      }
      onChange(null);
      toast({ title: "Farm image removed" });
    } catch (err: any) {
      toast({ title: "Couldn't remove image", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${sizeMap[size]} rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 ring-2 ring-border`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Farm" className="w-full h-full object-cover" />
        ) : (
          <Sprout className="w-1/2 h-1/2 text-white" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          {imageUrl ? "Change image" : "Upload image"}
        </Button>
        {imageUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={busy}
            className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Remove
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP. Max 5MB.</p>
      </div>
    </div>
  );
};

export default FarmImageUpload;
