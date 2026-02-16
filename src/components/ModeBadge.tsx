import { AlertTriangle, CheckCircle } from "lucide-react";

interface ModeBadgeProps {
  isTestMode: boolean;
}

export const ModeBadge = ({ isTestMode }: ModeBadgeProps) => {
  if (isTestMode) {
    return (
      <span className="badge-test">
        <AlertTriangle className="h-3 w-3" />
        TEST MODE
      </span>
    );
  }

  return (
    <span className="badge-live">
      <CheckCircle className="h-3 w-3" />
      LIVE MODE
    </span>
  );
};
