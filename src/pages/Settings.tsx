import { AppLayout } from "../components/AppLayout";
import { ModeBadge } from "../components/ModeBadge";

const Settings = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">설정</h2>
          <p className="text-sm text-muted-foreground">
            알림 시스템 설정을 관리합니다
          </p>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">운영 모드</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">현재 모드</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  환경변수 TEST_MODE로 제어됩니다
                </p>
              </div>
              <ModeBadge isTestMode={true} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">환경변수</h3>
          <div className="space-y-3 text-sm">
            {[
              { key: "TEST_MODE", desc: "테스트 모드 활성화 여부", value: "true" },
              { key: "TEST_PHONE_NUMBER", desc: "테스트 SMS 수신 번호", value: "설정 필요" },
              { key: "RESEND_API_KEY", desc: "Resend 이메일 API 키", value: "설정 필요" },
              { key: "NOTIFICATIONAPI_CLIENT_ID", desc: "NotificationAPI 클라이언트 ID", value: "설정 필요" },
            ].map((env) => (
              <div
                key={env.key}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <code className="text-xs font-mono text-primary">{env.key}</code>
                  <p className="mt-0.5 text-xs text-muted-foreground">{env.desc}</p>
                </div>
                <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
                  {env.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">알림 채널</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">📧 이메일 (Resend)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                기본 수신자: onboarding@resend.dev
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">💬 SMS (NotificationAPI)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                테스트 번호: TEST_PHONE_NUMBER 환경변수
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
