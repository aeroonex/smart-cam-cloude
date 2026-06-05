import { useEffect, useState } from "react";
import { Search, Users, ShieldCheck, Clock, Activity } from "lucide-react";
import { BoxLoader } from "@/components/BoxLoader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type UserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  last_active: string | null;
  telegram_id: number | null;
  wallet_balance: number | null;
  today_minutes: number;
};

function timeAgo(iso: string | null) {
  if (!iso) return "Noma'lum";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Hozir faol";
  if (diff < 3600) return `${Math.floor(diff / 60)} daq oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  return `${Math.floor(diff / 86400)} kun oldin`;
}

function isOnline(iso: string | null) {
  if (!iso) return false;
  return (Date.now() - new Date(iso).getTime()) / 1000 < 300;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name, username, avatar_url, role, created_at, last_active, telegram_id, wallet_balance")
      .order("last_active", { ascending: false, nullsFirst: false });

    if (!usersData) { setLoading(false); return; }

    // Today's session minutes per user
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: sessionsData } = await supabase
      .from("user_sessions" as never)
      .select("user_id, minutes")
      .gte("started_at", todayStart.toISOString())
      .not("minutes", "is", null) as unknown as { data: { user_id: string; minutes: number }[] | null };

    const minutesByUser: Record<string, number> = {};
    (sessionsData ?? []).forEach(s => {
      minutesByUser[s.user_id] = (minutesByUser[s.user_id] ?? 0) + s.minutes;
    });

    setUsers(usersData.map(u => ({
      ...u,
      today_minutes: minutesByUser[u.id] ?? 0,
    })));
    setLoading(false);
  }

  const displayed = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      String(u.telegram_id).includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchQ && matchRole;
  });

  const onlineCount = users.filter(u => isOnline(u.last_active)).length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const todayActive = users.filter(u => {
    if (!u.last_active) return false;
    return new Date(u.last_active).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jami", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Online", value: onlineCount, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Bugun faol", value: todayActive, icon: Clock, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Admin", value: adminCount, icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className={`${s.bg} rounded-xl p-2.5`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="text-xs text-neutral-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input placeholder="Ism, username yoki Telegram ID..." className="pl-9 h-9 rounded-xl"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none">
          <option value="">Barcha rollar</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <BoxLoader className="py-16" />
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Foydalanuvchi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Holat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Oxirgi faollik</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Bugun (daq)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Balans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {displayed.map(u => (
                  <tr key={u.id} className="hover:bg-neutral-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-[#1d4f8a]/10 flex items-center justify-center text-sm font-bold text-[#1d4f8a]">
                            {(u.full_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 truncate">{u.full_name ?? "—"}</p>
                          <p className="text-xs text-neutral-400 truncate">
                            {u.username ? `@${u.username}` : `ID: ${u.telegram_id ?? "—"}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}>
                        {u.role ?? "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isOnline(u.last_active)
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-100 text-neutral-400"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline(u.last_active) ? "bg-emerald-500" : "bg-neutral-300"}`} />
                        {isOnline(u.last_active) ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                      {timeAgo(u.last_active)}
                    </td>
                    <td className="px-4 py-3">
                      {u.today_minutes > 0 ? (
                        <span className="text-xs font-semibold text-[#1d4f8a]">
                          {u.today_minutes >= 60
                            ? `${Math.floor(u.today_minutes / 60)}s ${u.today_minutes % 60}d`
                            : `${u.today_minutes} daq`}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-neutral-700 whitespace-nowrap">
                      {u.wallet_balance != null
                        ? Number(u.wallet_balance).toLocaleString("uz-UZ") + " so'm"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {displayed.length === 0 && (
            <div className="py-12 text-center text-neutral-400 text-sm">
              <Users className="mx-auto mb-2 h-8 w-8 text-neutral-200" />
              Foydalanuvchi topilmadi
            </div>
          )}
        </div>
      )}
    </div>
  );
}
