import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, CheckCircle2, Circle, Loader2, Trash2, Pencil, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  todo: { label: "To Do", icon: Circle, color: "text-slate-500", badge: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", icon: Loader2, color: "text-blue-500", badge: "bg-blue-100 text-blue-700" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-600", badge: "bg-green-100 text-green-700" },
};

const priorityConfig = {
  low: { label: "Low", badge: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-700" },
  high: { label: "High", badge: "bg-red-100 text-red-700" },
};

const categoryLabels = {
  repair: "Repair", maintenance: "Maintenance", prep: "Prep",
  inventory: "Inventory", cleaning: "Cleaning", other: "Other",
};

const emptyForm = {
  title: "", description: "", status: "todo",
  priority: "medium", category: "other", assigned_to: "",
};

export default function TodoList() {
  const { toast } = useToast();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchTodos = async () => {
    const data = await base44.entities.Todo.list("-created_date", 200);
    setTodos(data);
    setLoading(false);
  };

  useEffect(() => { fetchTodos(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (todo) => {
    setEditing(todo);
    setForm({
      title: todo.title || "", description: todo.description || "",
      status: todo.status || "todo", priority: todo.priority || "medium",
      category: todo.category || "other", assigned_to: todo.assigned_to || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Todo.update(editing.id, form);
        toast({ title: "Task updated" });
      } else {
        const me = await base44.auth.me();
        await base44.entities.Todo.create({
          ...form,
          created_by_name: me?.full_name || me?.email || "Unknown",
        });
        toast({ title: "Task added" });
      }
      setDialogOpen(false);
      fetchTodos();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (todo) => {
    const newStatus = todo.status === "done" ? "todo" : "done";
    await base44.entities.Todo.update(todo.id, { status: newStatus });
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, status: newStatus } : t));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.Todo.delete(deleteTarget.id);
      setTodos((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: "Task deleted" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = filter === "all" ? todos : todos.filter((t) => t.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const order = { todo: 0, in_progress: 1, done: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const prio = { high: 0, medium: 1, low: 2 };
    return prio[a.priority] - prio[b.priority];
  });

  const counts = {
    all: todos.length,
    todo: todos.filter((t) => t.status === "todo").length,
    in_progress: todos.filter((t) => t.status === "in_progress").length,
    done: todos.filter((t) => t.status === "done").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shop To-Do</h1>
            <p className="text-sm text-muted-foreground">Track tasks and things that need to get done in the shop</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "todo", label: "To Do" },
          { key: "in_progress", label: "In Progress" },
          { key: "done", label: "Done" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {f.label} <span className="opacity-70">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No tasks yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((todo) => {
            const StatusIcon = statusConfig[todo.status]?.icon || Circle;
            return (
              <div
                key={todo.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border bg-card transition-colors hover:bg-muted/30",
                  todo.status === "done" && "opacity-60"
                )}
              >
                <button
                  onClick={() => toggleStatus(todo)}
                  className={cn("mt-0.5 shrink-0", statusConfig[todo.status]?.color)}
                  title="Toggle complete"
                >
                  <StatusIcon className={cn("h-5 w-5", todo.status === "in_progress" && "animate-spin")} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("font-medium", todo.status === "done" && "line-through")}>
                      {todo.title}
                    </p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityConfig[todo.priority]?.badge)}>
                      {priorityConfig[todo.priority]?.label}
                    </span>
                    {todo.category && todo.category !== "other" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {categoryLabels[todo.category]}
                      </span>
                    )}
                  </div>
                  {todo.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{todo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {todo.assigned_to && <span>Assigned: {todo.assigned_to}</span>}
                    {todo.created_by_name && <span>By: {todo.created_by_name}</span>}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(todo)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(todo)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to get done?"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Add any details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? "Save" : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}