import { AppLayout } from "../components/AppLayout";
import { NotificationLogTable } from "../components/NotificationLogTable";

const Logs = () => {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">알림 로그</h2>
          <p className="text-sm text-muted-foreground">
            모든 발송 내역을 확인하세요
          </p>
        </div>
        <NotificationLogTable />
      </div>
    </AppLayout>
  );
};

export default Logs;
