import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MessageSquare, CheckCircle, XCircle } from "lucide-react";

export const NotificationLogTable = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-semibold text-foreground">최근 알림 로그</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">발송된 알림 내역</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">구독명</th>
              <th className="px-5 py-3 font-medium">채널</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">수신자</th>
              <th className="px-5 py-3 font-medium">발송 시간</th>
              <th className="px-5 py-3 font-medium">유형</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium text-foreground">{log.subscription_name}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    {log.channel === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {log.channel === "email" ? "이메일" : "SMS"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {log.status === "success" ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle className="h-3.5 w-3.5" />성공</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" />실패</span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs font-mono">{log.recipient || "-"}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(log.sent_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {log.test_run ? (
                    <span className="badge-test text-[10px]">TEST</span>
                  ) : (
                    <span className="badge-live text-[10px]">LIVE</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading && <div className="px-5 py-12 text-center text-muted-foreground">로딩 중...</div>}
      {!isLoading && (logs ?? []).length === 0 && (
        <div className="px-5 py-12 text-center text-muted-foreground">아직 발송된 알림이 없습니다.</div>
      )}
    </div>
  );
};
