import { Bell, Calendar, Mail, MessageSquare, Activity } from "lucide-react";

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
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
        {icon}
      </div>
    </div>
  </div>
);

export const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="활성 구독"
        value={0}
        icon={<Calendar className="h-5 w-5" />}
        subtitle="등록된 구독 서비스"
      />
      <StatCard
        title="이번 주 갱신"
        value={0}
        icon={<Bell className="h-5 w-5" />}
        subtitle="7일 이내 결제 예정"
      />
      <StatCard
        title="발송된 이메일"
        value={0}
        icon={<Mail className="h-5 w-5" />}
        subtitle="총 이메일 알림"
      />
      <StatCard
        title="발송된 SMS"
        value={0}
        icon={<MessageSquare className="h-5 w-5" />}
        subtitle="총 SMS 알림"
      />
    </div>
  );
};
