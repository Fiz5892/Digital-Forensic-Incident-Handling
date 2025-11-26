import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

interface Case {
  id: string;
  case_type: string;
  victim_id: string;
  incident_date: string;
  summary: string | null;
  status: "open" | "investigation" | "closed";
  victims: { name: string };
}

const Cases = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [victims, setVictims] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    case_type: "",
    victim_id: "",
    incident_date: "",
    summary: "",
    status: "open" as "open" | "investigation" | "closed",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchCases();
      fetchVictims();
    }
  }, [session]);

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("cases")
      .select("*, victims(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch cases");
    } else {
      setCases(data || []);
    }
  };

  const fetchVictims = async () => {
    const { data } = await supabase.from("victims").select("id, name");
    setVictims(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) return;

    try {
      if (editingCase) {
        const { error } = await supabase
          .from("cases")
          .update(formData)
          .eq("id", editingCase.id);

        if (error) throw error;
        toast.success("Case updated successfully");
      } else {
        const { error } = await supabase
          .from("cases")
          .insert([{ ...formData, created_by: session.user.id }]);

        if (error) throw error;
        toast.success("Case added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCases();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this case?")) return;

    const { error } = await supabase.from("cases").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete case");
    } else {
      toast.success("Case deleted successfully");
      fetchCases();
    }
  };

  const resetForm = () => {
    setFormData({
      case_type: "",
      victim_id: "",
      incident_date: "",
      summary: "",
      status: "open",
    });
    setEditingCase(null);
  };

  const openEditDialog = (caseItem: Case) => {
    setEditingCase(caseItem);
    setFormData({
      case_type: caseItem.case_type,
      victim_id: caseItem.victim_id,
      incident_date: caseItem.incident_date.split("T")[0],
      summary: caseItem.summary || "",
      status: caseItem.status,
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: "warning",
      investigation: "default",
      closed: "success",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Cases Management</h2>
            <p className="text-muted-foreground mt-1">
              Track and manage investigation cases
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCase ? "Edit" : "Add"} Case</DialogTitle>
                <DialogDescription>
                  {editingCase ? "Update" : "Enter"} case information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case_type">Case Type *</Label>
                  <Input
                    id="case_type"
                    value={formData.case_type}
                    onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                    placeholder="e.g., Fraud, Cyberbullying, Malware"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="victim_id">Victim *</Label>
                  <Select
                    value={formData.victim_id}
                    onValueChange={(value) => setFormData({ ...formData, victim_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select victim" />
                    </SelectTrigger>
                    <SelectContent>
                      {victims.map((victim) => (
                        <SelectItem key={victim.id} value={victim.id}>
                          {victim.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incident_date">Incident Date *</Label>
                  <Input
                    id="incident_date"
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigation">Investigation</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCase ? "Update" : "Add"} Case
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Type</TableHead>
                <TableHead>Victim</TableHead>
                <TableHead>Incident Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No cases found. Click "Add Case" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.case_type}</TableCell>
                    <TableCell>{caseItem.victims.name}</TableCell>
                    <TableCell>{new Date(caseItem.incident_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(caseItem.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/cases/${caseItem.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(caseItem)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(caseItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Cases;