import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, CreditCard, Trash2, X, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ReminderRulesEditor } from "./ReminderRulesEditor";

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const BILLING_CYCLES = [
  { value: "monthly", label: "월간" },
  { value: "yearly", label: "연간" },
  { value: "weekly", label: "주간" },
  { value: "quarterly", label: "분기" },
];

export const SubscriptionList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRulesId, setEditingRulesId] = useState<string | null>(null);
  const [form, setForm] = useState({
    service_name: "",
    plan_name: "",
    price: 0,
    currency: "KRW",
    renewal_date: "",
    billing_cycle: "monthly",
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("renewal_date");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      // Insert subscription
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user!.id,
          service_name: form.service_name,
          plan_name: form.plan_name || null,
          price: form.price,
          currency: form.currency,
          renewal_date: form.renewal_date,
          billing_cycle: form.billing_cycle,
        })
        .select()
        .single();
      if (error) throw error;

      // Create default reminder rules (7일 전, 1일 전, 당일 - 이메일 기본)
      const defaultRules = [
        { subscription_id: sub.id, offset_days: 7, channel: "email" as const, enabled: true },
        { subscription_id: sub.id, offset_days: 1, channel: "email" as const, enabled: true },
        { subscription_id: sub.id, offset_days: 0, channel: "email" as const, enabled: true },
      ];
      await supabase.from("reminder_rules").insert(defaultRules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-count"] });
      setShowForm(false);
      setForm({ service_name: "", plan_name: "", price: 0, currency: "KRW", renewal_date: "", billing_cycle: "monthly" });
      toast.success("구독이 추가되었습니다");
    },
    onError: () => toast.error("구독 추가 실패"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-count"] });
      toast.success("구독이 삭제되었습니다");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">구독 서비스</h2>
          <p className="text-sm text-muted-foreground">등록된 구독 {subscriptions?.length ?? 0}개</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          구독 추가
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">새 구독 추가</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="서비스 이름 (예: Netflix)"
              value={form.service_name}
              onChange={(e) => setForm({ ...form, service_name: e.target.value })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              placeholder="플랜 이름 (예: Premium)"
              value={form.plan_name}
              onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="금액"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              >
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <select
              value={form.billing_cycle}
              onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            >
              {BILLING_CYCLES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.renewal_date}
              onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button
            onClick={() => addMutation.mutate()}
            disabled={!form.service_name || !form.renewal_date}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            추가 (기본 이메일 알림 자동 생성)
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {isLoading && <div className="text-center text-muted-foreground py-8">로딩 중...</div>}
        {(subscriptions ?? []).map((sub) => (
          <div key={sub.id} className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {sub.service_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{sub.service_name}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {sub.plan_name && <span>{sub.plan_name}</span>}
                    <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" />{formatCurrency(sub.price, sub.currency)}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{sub.renewal_date}</span>
                    <span className="capitalize">{BILLING_CYCLES.find(c => c.value === sub.billing_cycle)?.label || sub.billing_cycle}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingRulesId(editingRulesId === sub.id ? null : sub.id)}
                  className={`rounded-lg p-2 transition-colors ${editingRulesId === sub.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  title="알림 규칙 관리"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(sub.id)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {editingRulesId === sub.id && (
              <ReminderRulesEditor subscriptionId={sub.id} />
            )}
          </div>
        ))}
        {!isLoading && (subscriptions ?? []).length === 0 && (
          <div className="text-center text-muted-foreground py-8">등록된 구독이 없습니다. 구독을 추가해보세요.</div>
        )}
      </div>
    </div>
  );
};
