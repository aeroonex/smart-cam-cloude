import { useEffect, useState } from "react";
import { Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type AuditLog = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data as AuditLog[]) ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-500" />
          <span className="font-semibold text-gray-700">Admin harakatlari daftari (so'nggi 100)</span>
        </div>
        <Button onClick={load} disabled={loading} size="sm" variant="outline">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">Sana</th>
              <th className="text-left px-4 py-2">Amal</th>
              <th className="text-left px-4 py-2">Jadval</th>
              <th className="text-left px-4 py-2">O'zgartirilgan ustunlar</th>
              <th className="text-left px-4 py-2">Record ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(selected?.id === log.id ? null : log)}
              >
                <td className="px-4 py-2.5 whitespace-nowrap text-gray-500 text-xs">
                  {new Date(log.created_at).toLocaleString("uz-UZ")}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{log.table_name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">
                  {log.changed_fields?.join(", ") ?? "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                  {log.record_id?.slice(0, 8).toUpperCase() ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-400">Hali hech qanday log yo'q</div>
        )}
      </div>

      {/* Batafsil ko'rish */}
      {selected && (
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs overflow-auto max-h-64">
          <p className="text-gray-400 mb-2"># {selected.table_name} — {selected.action} — {selected.created_at}</p>
          {selected.old_data && (
            <>
              <p className="text-red-400">--- eski qiymat:</p>
              <pre>{JSON.stringify(selected.old_data, null, 2)}</pre>
            </>
          )}
          {selected.new_data && (
            <>
              <p className="text-green-400 mt-2">+++ yangi qiymat:</p>
              <pre>{JSON.stringify(selected.new_data, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
