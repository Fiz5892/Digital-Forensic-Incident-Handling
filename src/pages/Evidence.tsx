import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, FileIcon } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { Progress } from "@/components/ui/progress";

const Evidence = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<any>(null);
  const [formData, setFormData] = useState({
    case_id: "",
    evidence_type: "",
    storage_location: "",
    file_hash: "",
    file_name: "",
    description: "",
    file_size: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      fetchEvidence();
      fetchCases();
    }
  }, [session]);

  const fetchEvidence = async () => {
    const { data, error } = await supabase
      .from("evidence")
      .select("*, cases(case_type)")
      .order("created_at", { ascending: false });

    if (!error) setEvidence(data || []);
  };

  const fetchCases = async () => {
    const { data } = await supabase.from("cases").select("id, case_type");
    setCases(data || []);
  };

  const generateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFormData({
      ...formData,
      file_name: file.name,
      file_size: file.size,
    });

    toast.info("Generating SHA-256 hash...");
    try {
      const hash = await generateSHA256(file);
      setFormData(prev => ({ ...prev, file_hash: hash }));
      toast.success("File hash generated");
    } catch (error) {
      toast.error("Failed to generate hash");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    setUploading(true);
    try {
      let filePath = formData.storage_location;

      // Upload file if selected
      if (selectedFile && !editingEvidence) {
        setUploadProgress(10);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        filePath = `${session.user.id}/${fileName}`;

        setUploadProgress(50);
        const { error: uploadError } = await supabase.storage
          .from('evidence-files')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
        setUploadProgress(80);
      }

      const dataToSave = {
        ...formData,
        storage_location: filePath,
      };

      if (editingEvidence) {
        await supabase.from("evidence").update(dataToSave).eq("id", editingEvidence.id);
        toast.success("Evidence updated");
      } else {
        await supabase.from("evidence").insert([{ ...dataToSave, created_by: session.user.id }]);
        toast.success("Evidence added");
      }
      
      setUploadProgress(100);
      setIsDialogOpen(false);
      resetForm();
      fetchEvidence();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this evidence?")) return;
    await supabase.from("evidence").delete().eq("id", id);
    toast.success("Evidence deleted");
    fetchEvidence();
  };

  const resetForm = () => {
    setFormData({ case_id: "", evidence_type: "", storage_location: "", file_hash: "", file_name: "", description: "", file_size: 0 });
    setEditingEvidence(null);
    setSelectedFile(null);
    setUploadProgress(0);
  };

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Digital Evidence</h2>
            <p className="text-muted-foreground mt-1">Manage evidence with SHA-256 integrity</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Evidence</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingEvidence ? "Edit" : "Add"} Evidence</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Case *</Label>
                  <Select value={formData.case_id} onValueChange={(v) => setFormData({ ...formData, case_id: v })} required>
                    <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                    <SelectContent>{cases.map(c => <SelectItem key={c.id} value={c.id}>{c.case_type}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Evidence Type *</Label>
                  <Input value={formData.evidence_type} onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value })} placeholder="Photo, Log, Document" required />
                </div>
                {!editingEvidence && (
                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileIcon className="h-4 w-4" />
                          {selectedFile.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Storage Location</Label>
                  <Input 
                    value={formData.storage_location} 
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })} 
                    placeholder="Auto-filled on upload"
                    disabled={!!selectedFile}
                  />
                </div>
                <div className="space-y-2">
                  <Label>File Hash (SHA-256)</Label>
                  <Input 
                    value={formData.file_hash} 
                    onChange={(e) => setFormData({ ...formData, file_hash: e.target.value })} 
                    placeholder="Auto-generated on upload"
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>
                {uploading && (
                  <div className="space-y-2">
                    <Label>Upload Progress</Label>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={uploading}>Cancel</Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Uploading..." : editingEvidence ? "Update" : "Add"}
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
                <TableHead>Type</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.evidence_type}</TableCell>
                  <TableCell>{e.cases.case_type}</TableCell>
                  <TableCell>{e.storage_location}</TableCell>
                  <TableCell className="font-mono text-xs">{e.file_hash ? e.file_hash.substring(0, 16) + "..." : "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingEvidence(e); setFormData(e); setIsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Evidence;