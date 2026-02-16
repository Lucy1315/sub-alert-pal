import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bell, Calendar, Mail, MessageSquare } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, subtitle }: StatCardProps) => (
  <div className="glass-card p-5 glow-primary">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
    </div>
  </div>
);

export const DashboardStats = () => {
  const { data: subCount } = useQuery({
    queryKey: ["subscriptions-count"],
    queryFn: async () => {
      const { count } = await supabase.from("subscriptions").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: upcomingCount } = useQuery({
    queryKey: ["upcoming-renewals"],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .lte("renewal_date", nextWeek.toISOString().split("T")[0])
        .gte("renewal_date", today.toISOString().split("T")[0]);
      return count ?? 0;
    },
  });

  const { data: emailCount } = useQuery({
    queryKey: ["email-log-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("channel", "email");
      return count ?? 0;
    },
  });

  const { data: smsCount } = useQuery({
    queryKey: ["sms-log-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("channel", "sms");
      return count ?? 0;
    },
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="활성 구독" value={subCount ?? 0} icon={<Calendar className="h-5 w-5" />} subtitle="등록된 구독 서비스" />
      <StatCard title="이번 주 갱신" value={upcomingCount ?? 0} icon={<Bell className="h-5 w-5" />} subtitle="7일 이내 결제 예정" />
      <StatCard title="발송된 이메일" value={emailCount ?? 0} icon={<Mail className="h-5 w-5" />} subtitle="총 이메일 알림" />
      <StatCard title="발송된 SMS" value={smsCount ?? 0} icon={<MessageSquare className="h-5 w-5" />} subtitle="총 SMS 알림" />
    </div>
  );
};
