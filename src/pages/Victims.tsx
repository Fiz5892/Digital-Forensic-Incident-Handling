import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

interface Victim {
  id: string;
  name: string;
  contact: string | null;
  location: string | null;
  address: string | null;
  report_date: string;
  description: string | null;
}

const Victims = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [victims, setVictims] = useState<Victim[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVictim, setEditingVictim] = useState<Victim | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    location: "",
    address: "",
    description: "",
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
    if (session) fetchVictims();
  }, [session]);

  const fetchVictims = async () => {
    const { data, error } = await supabase
      .from("victims")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch victims");
    } else {
      setVictims(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) return;

    try {
      if (editingVictim) {
        const { error } = await supabase
          .from("victims")
          .update(formData)
          .eq("id", editingVictim.id);

        if (error) throw error;
        toast.success("Victim updated successfully");
      } else {
        const { error } = await supabase
          .from("victims")
          .insert([{ ...formData, created_by: session.user.id }]);

        if (error) throw error;
        toast.success("Victim added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchVictims();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this victim?")) return;

    const { error } = await supabase.from("victims").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete victim");
    } else {
      toast.success("Victim deleted successfully");
      fetchVictims();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact: "",
      location: "",
      address: "",
      description: "",
    });
    setEditingVictim(null);
  };

  const openEditDialog = (victim: Victim) => {
    setEditingVictim(victim);
    setFormData({
      name: victim.name,
      contact: victim.contact || "",
      location: victim.location || "",
      address: victim.address || "",
      description: victim.description || "",
    });
    setIsDialogOpen(true);
  };

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Victims Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage victim information and reports
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Victim
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVictim ? "Edit" : "Add"} Victim</DialogTitle>
                <DialogDescription>
                  {editingVictim ? "Update" : "Enter"} victim information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingVictim ? "Update" : "Add"} Victim
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
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Report Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {victims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No victims found. Click "Add Victim" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                victims.map((victim) => (
                  <TableRow key={victim.id}>
                    <TableCell className="font-medium">{victim.name}</TableCell>
                    <TableCell>{victim.contact || "-"}</TableCell>
                    <TableCell>{victim.location || "-"}</TableCell>
                    <TableCell>{new Date(victim.report_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(victim)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(victim.id)}
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

export default Victims;