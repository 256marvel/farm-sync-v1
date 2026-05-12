import logo from "@/assets/farmsync-logo.png";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Official FarmSync Pro app logo. Use this everywhere the app brand is shown.
 */
const AppLogo = ({ className, alt = "FarmSync Pro" }: AppLogoProps) => (
  <img
    src={logo}
    alt={alt}
    className={cn("object-contain select-none", className)}
    draggable={false}
  />
);

export default AppLogo;
