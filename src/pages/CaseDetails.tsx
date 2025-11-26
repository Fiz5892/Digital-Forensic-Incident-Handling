import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Shield, User, Calendar, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCase] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
      else fetchCaseDetails();
    };
    checkAuth();
  }, [id]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    
    // Fetch case with victim data
    const { data: caseData } = await supabase
      .from("cases")
      .select("*, victims(*)")
      .eq("id", id)
      .single();

    if (caseData) setCase(caseData);

    // Fetch evidence
    const { data: evidenceData } = await supabase
      .from("evidence")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false });

    if (evidenceData) setEvidence(evidenceData);

    // Fetch actions
    const { data: actionsData } = await supabase
      .from("forensic_actions")
      .select("*")
      .eq("case_id", id)
      .order("execution_time", { ascending: false });

    if (actionsData) setActions(actionsData);

    setLoading(false);
  };

  const exportToPDF = () => {
    if (!caseData) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Case Report", 14, 20);
    
    // Case Information
    doc.setFontSize(12);
    doc.text(`Case ID: ${caseData.id}`, 14, 35);
    doc.text(`Case Type: ${caseData.case_type}`, 14, 42);
    doc.text(`Status: ${caseData.status}`, 14, 49);
    doc.text(`Incident Date: ${new Date(caseData.incident_date).toLocaleDateString()}`, 14, 56);
    
    // Victim Information
    doc.setFontSize(14);
    doc.text("Victim Information", 14, 70);
    doc.setFontSize(10);
    doc.text(`Name: ${caseData.victims.name}`, 14, 78);
    doc.text(`Contact: ${caseData.victims.contact || 'N/A'}`, 14, 84);
    doc.text(`Location: ${caseData.victims.location || 'N/A'}`, 14, 90);

    // Evidence Table
    if (evidence.length > 0) {
      doc.setFontSize(14);
      doc.text("Evidence", 14, 104);
      
      autoTable(doc, {
        startY: 108,
        head: [['Type', 'File Name', 'Hash', 'Collection Time']],
        body: evidence.map(e => [
          e.evidence_type,
          e.file_name || 'N/A',
          e.file_hash ? e.file_hash.substring(0, 16) + '...' : 'N/A',
          new Date(e.collection_time).toLocaleDateString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
      });
    }

    // Forensic Actions Table
    if (actions.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      
      doc.setFontSize(14);
      doc.text("Forensic Actions", 14, finalY + 14);
      
      autoTable(doc, {
        startY: finalY + 18,
        head: [['Investigator', 'Action', 'Status', 'Time']],
        body: actions.map(a => [
          a.investigator_name,
          a.action_description.substring(0, 50) + '...',
          a.status,
          new Date(a.execution_time).toLocaleDateString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
      });
    }

    // Save PDF
    doc.save(`case-report-${caseData.id}.pdf`);
    toast.success("PDF report generated");
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "investigation":
        return "warning";
      case "closed":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading case details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">Case not found</p>
          <Button onClick={() => navigate("/cases")}>Back to Cases</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cases")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold">Case Details</h2>
              <p className="text-muted-foreground">{caseData.case_type}</p>
            </div>
          </div>
          <Button onClick={exportToPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Case Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Case ID:</span>
                <span className="font-mono text-sm">{caseData.id.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusVariant(caseData.status)}>{caseData.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incident Date:</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(caseData.incident_date).toLocaleDateString()}
                </span>
              </div>
              {caseData.summary && (
                <div>
                  <p className="text-muted-foreground mb-2">Summary:</p>
                  <p className="text-sm">{caseData.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Victim Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{caseData.victims.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact:</span>
                <span>{caseData.victims.contact || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span>{caseData.victims.location || "N/A"}</span>
              </div>
              {caseData.victims.address && (
                <div>
                  <p className="text-muted-foreground mb-2">Address:</p>
                  <p className="text-sm">{caseData.victims.address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evidence */}
        <Card>
          <CardHeader>
            <CardTitle>Digital Evidence</CardTitle>
            <CardDescription>{evidence.length} pieces of evidence collected</CardDescription>
          </CardHeader>
          <CardContent>
            {evidence.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No evidence collected yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Collection Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.evidence_type}</TableCell>
                      <TableCell>{e.file_name || "N/A"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.file_hash ? e.file_hash.substring(0, 16) + "..." : "-"}
                      </TableCell>
                      <TableCell>{new Date(e.collection_time).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Forensic Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Forensic Actions
            </CardTitle>
            <CardDescription>{actions.length} actions performed</CardDescription>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No actions performed yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investigator</TableHead>
                    <TableHead>Action Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Execution Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.investigator_name}</TableCell>
                      <TableCell>{action.action_description}</TableCell>
                      <TableCell>
                        <Badge variant={action.status === "completed" ? "success" : "default"}>
                          {action.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(action.execution_time).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CaseDetails;
