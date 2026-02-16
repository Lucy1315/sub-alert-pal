import { AppLayout } from "../components/AppLayout";
import { DashboardStats } from "../components/DashboardStats";
import { UpcomingRenewals } from "../components/UpcomingRenewals";
import { NotificationLogTable } from "../components/NotificationLogTable";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            구독 결제 알림 현황을 확인하세요
          </p>
        </div>
        <DashboardStats />
        <UpcomingRenewals />
        <NotificationLogTable />
      </div>
    </AppLayout>
  );
};

export default Index;
