import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

const ForensicActions = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    case_id: "",
    action_description: "",
    investigator_name: "",
    status: "pending",
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
      fetchActions();
      fetchCases();
    }
  }, [session]);

  const fetchActions = async () => {
    const { data } = await supabase.from("forensic_actions").select("*, cases(case_type)").order("created_at", { ascending: false });
    setActions(data || []);
  };

  const fetchCases = async () => {
    const { data } = await supabase.from("cases").select("id, case_type");
    setCases(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    await supabase.from("forensic_actions").insert([{ ...formData, created_by: session.user.id }]);
    toast.success("Action added");
    setIsDialogOpen(false);
    setFormData({ case_id: "", action_description: "", investigator_name: "", status: "pending" });
    fetchActions();
  };

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Forensic Actions</h2>
            <p className="text-muted-foreground mt-1">Track investigation actions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Action</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Forensic Action</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Case *</Label>
                  <Select value={formData.case_id} onValueChange={(v) => setFormData({ ...formData, case_id: v })} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cases.map(c => <SelectItem key={c.id} value={c.id}>{c.case_type}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action Description *</Label>
                  <Textarea value={formData.action_description} onChange={(e) => setFormData({ ...formData, action_description: e.target.value })} required rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Investigator Name *</Label>
                  <Input value={formData.investigator_name} onChange={(e) => setFormData({ ...formData, investigator_name: e.target.value })} required />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Add Action</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-lg border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Investigator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.cases.case_type}</TableCell>
                  <TableCell>{a.action_description}</TableCell>
                  <TableCell>{a.investigator_name}</TableCell>
                  <TableCell><Badge variant={a.status === "pending" ? "warning" : "success"}>{a.status}</Badge></TableCell>
                  <TableCell>{new Date(a.execution_time).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ForensicActions;