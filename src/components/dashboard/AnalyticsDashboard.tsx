import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, FileText, Shield, Users, Activity } from "lucide-react";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AnalyticsDashboard() {
  const [cases, setCases] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: casesData } = await supabase.from("cases").select("*");
    const { data: evidenceData } = await supabase.from("evidence").select("*");
    const { data: actionsData } = await supabase.from("forensic_actions").select("*");
    const { data: profilesData } = await supabase.from("profiles").select("*");

    if (casesData) setCases(casesData);
    if (evidenceData) setEvidence(evidenceData);
    if (actionsData) setActions(actionsData);
    if (profilesData) setProfiles(profilesData);
  };

  // Cases by status
  const casesByStatus = cases.reduce((acc: any, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(casesByStatus).map(([name, value]) => ({ name, value }));

  // Cases by type
  const casesByType = cases.reduce((acc: any, c) => {
    acc[c.case_type] = (acc[c.case_type] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(casesByType)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  // Cases trend (last 6 months)
  const trendData = cases
    .filter(c => new Date(c.created_at) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000))
    .reduce((acc: any, c) => {
      const month = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

  const trendChartData = Object.entries(trendData).map(([month, cases]) => ({ month, cases }));

  // Evidence type distribution
  const evidenceTypeData = evidence.reduce((acc: any, e) => {
    acc[e.evidence_type] = (acc[e.evidence_type] || 0) + 1;
    return acc;
  }, {});

  const evidenceChartData = Object.entries(evidenceTypeData).map(([name, value]) => ({
    name,
    value,
  }));

  // Investigator performance
  const investigatorData = actions.reduce((acc: any, action) => {
    acc[action.investigator_name] = (acc[action.investigator_name] || 0) + 1;
    return acc;
  }, {});

  const investigatorChartData = Object.entries(investigatorData)
    .map(([name, actions]) => ({ name, actions }))
    .sort((a: any, b: any) => b.actions - a.actions)
    .slice(0, 5);

  const stats = [
    { icon: Users, label: "Total Users", value: profiles.length, color: "text-primary" },
    { icon: FileText, label: "Total Cases", value: cases.length, color: "text-warning" },
    { icon: Shield, label: "Total Evidence", value: evidence.length, color: "text-success" },
    { icon: Activity, label: "Total Actions", value: actions.length, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of system statistics and trends</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cases by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cases by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Case Types */}
        <Card>
          <CardHeader>
            <CardTitle>Top Case Types</CardTitle>
            <CardDescription>Most common case types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cases Trend */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cases Trend (Last 6 Months)</CardTitle>
            <CardDescription>Number of cases over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cases" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evidence Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence Type Distribution</CardTitle>
            <CardDescription>Types of evidence collected</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={evidenceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {evidenceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Investigator Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Top Investigators
            </CardTitle>
            <CardDescription>By number of actions performed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={investigatorChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actions" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
