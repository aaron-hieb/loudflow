import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Plus, Loader2, ExternalLink, Trash2, Camera, Download, CheckSquare, Square } from "lucide-react";
import ReceiptScanner from "./ReceiptScanner";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const defaultForm = {
  description: "", amount: "", reimbursement_to: "", notes: "", receipt_url: "", status: "pending"
};

export default function ReimbursementsTab({ eventId, isAdmin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [addingToExpenses, setAddingToExpenses] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, [eventId]);

  async function load() {
    const data = await base44.entities.Reimbursement.filter({ event_id: eventId }, "-created_date");
    setItems(data);
    setLoading(false);
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, receipt_url: file_url }));
    setUploading(false);
  }

  async function handleScannedPdf(pdfFile) {
    setShowScanner(false);
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    setForm((f) => ({ ...f, receipt_url: file_url }));
    setUploading(false);
  }

  async function handleSubmit() {
    setSaving(true);
    const user = await base44.auth.me();
    const payload = {
      event_id: eventId,
      receipt_url: form.receipt_url,
      description: form.description,
      reimbursement_to: form.reimbursement_to,
      notes: form.notes,
      submitted_by: user?.full_name || user?.email || "Unknown",
      status: "pending",
    };
    if (form.amount) payload.amount = Number(form.amount);
    await base44.entities.Reimbursement.create(payload);
    setForm(defaultForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleStatusChange(id, status) {
    await base44.entities.Reimbursement.update(id, { status });
    load();
  }

  async function handleDelete() {
    await base44.entities.Reimbursement.delete(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  async function handleAddToExpenses(item) {
    const alreadyAdded = item.added_to_expenses;
    setAddingToExpenses((prev) => ({ ...prev, [item.id]: true }));

    if (alreadyAdded) {
      // Remove the linked expense and unmark
      if (item.expense_id) {
        await base44.entities.Expense.delete(item.expense_id);
      }
      await base44.entities.Reimbursement.update(item.id, { added_to_expenses: false, expense_id: null });
    } else {
      // Create expense from reimbursement
      const expense = await base44.entities.Expense.create({
        event_id: eventId,
        description: item.description || `Reimbursement - ${item.reimbursement_to}`,
        amount: item.amount || 0,
        category: "other",
        vendor: item.reimbursement_to,
        notes: `Auto-added from approved reimbursement. Submitted by: ${item.submitted_by || "Unknown"}`,
      });
      await base44.entities.Reimbursement.update(item.id, { added_to_expenses: true, expense_id: expense.id });
    }

    setAddingToExpenses((prev) => ({ ...prev, [item.id]: false }));
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reimbursements</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Submit Receipt
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No reimbursements submitted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.description || "Receipt"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[item.status] || statusStyles.pending}`}>
                      {item.status}
                    </span>
                    {item.amount && (
                      <span className="text-sm font-semibold text-primary">${Number(item.amount).toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reimburse to: <span className="font-medium text-foreground">{item.reimbursement_to}</span>
                    {item.submitted_by && <> · Submitted by {item.submitted_by}</>}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {item.receipt_url && (
                    <>
                      <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <ExternalLink className="h-3 w-3" /> View
                        </Button>
                      </a>
                      {isAdmin && (
                        <a href={item.receipt_url} download>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </a>
                      )}
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
                        <SelectTrigger className="h-8 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.status === "approved" && (
                        <button
                          onClick={() => handleAddToExpenses(item)}
                          disabled={!!addingToExpenses[item.id]}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${
                            item.added_to_expenses
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                          title={item.added_to_expenses ? "Remove from expenses" : "Add to expenses"}
                        >
                          {addingToExpenses[item.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : item.added_to_expenses ? (
                            <CheckSquare className="h-3.5 w-3.5" />
                          ) : (
                            <Square className="h-3.5 w-3.5" />
                          )}
                          Add to Expenses
                        </button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showScanner && (
        <ReceiptScanner onScanned={handleScannedPdf} onClose={() => setShowScanner(false)} />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Reimbursement?"
        itemName={deleteTarget?.description}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Reimbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Receipt *</Label>
              <div className="mt-1">
                {form.receipt_url ? (
                  <div className="flex items-center gap-2">
                    <a href={form.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> View uploaded receipt
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, receipt_url: "" }))}>Change</Button>
                  </div>
                ) : uploading ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mt-2">Uploading...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors">
                      <Receipt className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground text-center">Choose file</span>
                      <span className="text-xs text-muted-foreground text-center">Image or PDF</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors w-full"
                    >
                      <Camera className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground text-center">Scan receipt</span>
                      <span className="text-xs text-muted-foreground text-center">Crop → PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Reimburse To * <span className="text-muted-foreground font-normal">(who should receive the payment)</span></Label>
              <Input value={form.reimbursement_to} onChange={(e) => setForm({ ...form, reimbursement_to: e.target.value })} placeholder="Full name or email" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Catering supplies" />
              </div>
            </div>
            <div>
              <Label>Notes to Admin</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional context for the admin..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !form.receipt_url || !form.reimbursement_to || uploading}>
                {saving ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}