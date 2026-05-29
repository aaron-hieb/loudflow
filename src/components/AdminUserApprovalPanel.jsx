import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, Check, X } from "lucide-react";

export default function AdminUserApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchPending = async () => {
    const all = await base44.entities.UserApproval.filter({ status: "pending" });
    setPendingUsers(all);
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (approval, status) => {
    const me = await base44.auth.me();
    await base44.entities.UserApproval.update(approval.id, {
      status,
      reviewed_by: me.email,
    });
    setPendingUsers((prev) => prev.filter((u) => u.id !== approval.id));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative w-full justify-start gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <Users className="w-4 h-4" />
          User Requests
          {pendingUsers.length > 0 && (
            <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {pendingUsers.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>User Access Requests</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {pendingUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No pending requests</p>
          ) : (
            pendingUsers.map((approval) => (
              <div key={approval.id} className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-medium text-sm">{approval.user_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{approval.user_email}</p>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 mt-1 text-xs">
                    Pending
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleDecision(approval, "approved")}
                  >
                    <Check className="w-3 h-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => handleDecision(approval, "denied")}
                  >
                    <X className="w-3 h-3" /> Deny
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}