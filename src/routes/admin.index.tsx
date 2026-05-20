import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, RefreshCw, Trash2 } from "lucide-react";

type Order = {
  id: string;
  package_label: string;
  package_quantity: number;
  amount: number;
  phone: string;
  profile_link: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["pending", "paid", "delivered", "cancelled"];

export const Route = createFileRoute("/admin/")({
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin Panel" }] }),
});

function AdminPanel() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!mounted) return;
      if (!roles) {
        setAuthChecked(true);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      setAuthChecked(true);
      loadOrders();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", id);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await supabase.from("orders").delete().eq("id", id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSales = orders
      .filter((o) => o.status === "paid" || o.status === "delivered")
      .reduce((s, o) => s + Number(o.amount), 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return { totalOrders, totalSales, pending, delivered };
  }, [orders]);

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking access...</div>;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="text-sm text-muted-foreground">Your account doesn't have admin privileges.</p>
          <Button onClick={handleLogout} variant="outline">Sign out</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <Button onClick={loadOrders} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Orders" value={stats.totalOrders.toString()} />
          <StatCard label="Total Sales" value={"₹" + stats.totalSales.toLocaleString("en-IN")} />
          <StatCard label="Pending" value={stats.pending.toString()} />
          <StatCard label="Delivered" value={stats.delivered.toString()} />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Filter:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No orders yet.</TableCell></TableRow>
              )}
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="font-medium">{o.package_label}</TableCell>
                  <TableCell>₹{Number(o.amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <a href={`https://wa.me/91${o.phone}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      {o.phone}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{o.profile_link}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteOrder(o.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
