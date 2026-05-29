import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function PendingApprovalScreen({ status }) {
  const isDenied = status === "denied";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${isDenied ? "bg-destructive/10" : "bg-amber-100"}`}>
          {isDenied ? (
            <span className="text-4xl">🚫</span>
          ) : (
            <Clock className="w-10 h-10 text-amber-500" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isDenied ? "Access Denied" : "Awaiting Approval"}
          </h1>
          <p className="text-muted-foreground">
            {isDenied
              ? "Your access request has been denied by an administrator. Please contact support if you believe this is a mistake."
              : "Your account is pending administrator approval. You'll have access once an admin reviews your request."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => base44.auth.logout()}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}