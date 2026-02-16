import { AppLayout } from "../components/AppLayout";
import { DashboardStats } from "../components/DashboardStats";
import { NotificationLogTable } from "../components/NotificationLogTable";
import { ModeBadge } from "../components/ModeBadge";
import { Activity } from "lucide-react";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              구독 결제 알림 현황을 확인하세요
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <ModeBadge isTestMode={true} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 animate-pulse-glow text-success" />
              시스템 정상
            </div>
          </div>
        </div>

        {/* Test Mode Banner */}
        <div className="glass-card border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-warning/10 p-2 text-warning">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-warning">
                테스트 모드 활성화
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                매일 09:00 (KST)에 onboarding@resend.dev로 테스트 이메일과 SMS가
                자동 발송됩니다. 실제 구독 데이터와 무관하게 동작합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <DashboardStats />

        {/* Recent Logs */}
        <NotificationLogTable />
      </div>
    </AppLayout>
  );
};

export default Index;
