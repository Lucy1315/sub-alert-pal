import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const OFFSET_OPTIONS = [
  { value: 7, label: "7일 전" },
  { value: 3, label: "3일 전" },
  { value: 1, label: "1일 전" },
  { value: 0, label: "당일" },
];

interface Props {
  subscriptionId: string;
}

export const ReminderRulesEditor = ({ subscriptionId }: Props) => {
  const queryClient = useQueryClient();
  const [newOffset, setNewOffset] = useState(7);
  const [newChannel, setNewChannel] = useState<"email" | "sms">("email");

  const { data: rules, isLoading } = useQuery({
    queryKey: ["reminder-rules", subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_rules")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("offset_days", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reminder_rules").insert({
        subscription_id: subscriptionId,
        offset_days: newOffset,
        channel: newChannel,
        enabled: true,
      });
      if (error) {
        if (error.code === "23505") throw new Error("이미 존재하는 규칙입니다");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-rules", subscriptionId] });
      toast.success("알림 규칙이 추가되었습니다");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("reminder_rules").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminder-rules", subscriptionId] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminder_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-rules", subscriptionId] });
      toast.success("알림 규칙이 삭제되었습니다");
    },
  });

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 space-y-3">
      <h4 className="text-sm font-medium text-foreground">알림 규칙</h4>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">로딩 중...</p>
      ) : (
        <div className="space-y-2">
          {(rules ?? []).map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleRule.mutate({ id: rule.id, enabled: !rule.enabled })}
                  className={`h-4 w-4 rounded border transition-colors ${
                    rule.enabled ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}
                />
                <span className={`text-sm ${rule.enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                  {OFFSET_OPTIONS.find((o) => o.value === rule.offset_days)?.label || `${rule.offset_days}일 전`}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {rule.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                  {rule.channel === "email" ? "이메일" : "SMS"}
                </span>
              </div>
              <button onClick={() => deleteRule.mutate(rule.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(rules ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">알림 규칙이 없습니다.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <select
          value={newOffset}
          onChange={(e) => setNewOffset(Number(e.target.value))}
          className="rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground"
        >
          {OFFSET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value as "email" | "sms")}
          className="rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground"
        >
          <option value="email">이메일</option>
          <option value="sms">SMS</option>
        </select>
        <button
          onClick={() => addRule.mutate()}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" />
          추가
        </button>
      </div>
    </div>
  );
};
