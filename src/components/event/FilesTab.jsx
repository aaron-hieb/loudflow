import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FileText, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const categoryLabels = {
  contract: "Contract", rider: "Rider", stage_plot: "Stage Plot",
  schedule: "Schedule", invoice: "Invoice", permit: "Permit", other: "Other",
};

const categoryColors = {
  contract: "bg-blue-100 text-blue-700",
  rider: "bg-violet-100 text-violet-700",
  stage_plot: "bg-amber-100 text-amber-700",
  schedule: "bg-emerald-100 text-emerald-700",
  invoice: "bg-rose-100 text-rose-700",
  permit: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

export default function FilesTab({ eventId, files, onRefresh, isAdmin }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "other", notes: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.EventFile.create({
      event_id: eventId,
      name: form.name || file.name,
      file_url,
      category: form.category,
      notes: form.notes,
    });
    setShowAdd(false);
    setForm({ name: "", category: "other", notes: "" });
    setFile(null);
    setUploading(false);
    onRefresh();
  }

  async function handleDelete(id) {
    await base44.entities.EventFile.delete(id);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Files</h3>
        {isAdmin && (
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Upload File
        </Button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {f.category && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", categoryColors[f.category] || categoryColors.other)}>
                        {categoryLabels[f.category] || f.category}
                      </span>
                    )}
                    {f.notes && <span className="text-xs text-muted-foreground">{f.notes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:text-primary transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
                {isAdmin && (
                <button
                  onClick={() => handleDelete(f.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>File *</Label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : "Click to select a file"}
                  </span>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div>
              <Label>Display Name</Label>
              <Input
                placeholder={file?.name || ""}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}