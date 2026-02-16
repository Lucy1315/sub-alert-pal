import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, CreditCard, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const SubscriptionList = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: 0,
    currency: "KRW",
    renewal_date: "",
    notify_days_before: 3,
    notify_email: true,
    notify_sms: false,
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("*").order("renewal_date");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subscriptions").insert({
        name: form.name,
        amount: form.amount,
        currency: form.currency,
        renewal_date: form.renewal_date,
        notify_days_before: form.notify_days_before,
        notify_email: form.notify_email,
        notify_sms: form.notify_sms,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-count"] });
      setShowForm(false);
      setForm({ name: "", amount: 0, currency: "KRW", renewal_date: "", notify_days_before: 3, notify_email: true, notify_sms: false });
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

      {/* Add Form */}
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
              placeholder="서비스 이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="금액"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
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
            <input
              type="date"
              value={form.renewal_date}
              onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            />
            <input
              type="number"
              placeholder="알림 일수"
              value={form.notify_days_before}
              onChange={(e) => setForm({ ...form, notify_days_before: Number(e.target.value) })}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-foreground">
              <input type="checkbox" checked={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.checked })} />
              이메일 알림
            </label>
            <label className="flex items-center gap-2 text-foreground">
              <input type="checkbox" checked={form.notify_sms} onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })} />
              SMS 알림
            </label>
          </div>
          <button
            onClick={() => addMutation.mutate()}
            disabled={!form.name || !form.renewal_date}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            추가
          </button>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {isLoading && <div className="text-center text-muted-foreground py-8">로딩 중...</div>}
        {(subscriptions ?? []).map((sub) => (
          <div key={sub.id} className="glass-card flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                {sub.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-foreground">{sub.name}</p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" />{formatCurrency(sub.amount, sub.currency)}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{sub.renewal_date}</span>
                  <span>{sub.notify_days_before}일 전 알림</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {sub.notify_email && <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Email</span>}
                {sub.notify_sms && <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">SMS</span>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(sub.id)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && (subscriptions ?? []).length === 0 && (
          <div className="text-center text-muted-foreground py-8">등록된 구독이 없습니다. 구독을 추가해보세요.</div>
        )}
      </div>
    </div>
  );
};
