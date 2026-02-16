import { Plus, Calendar, CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  renewal_date: string;
  notify_days_before: number;
  notify_email: boolean;
  notify_sms: boolean;
}

const mockSubscriptions: Subscription[] = [
  {
    id: "1",
    name: "Netflix",
    amount: 17000,
    currency: "KRW",
    renewal_date: "2026-03-01",
    notify_days_before: 3,
    notify_email: true,
    notify_sms: false,
  },
  {
    id: "2",
    name: "Spotify",
    amount: 10900,
    currency: "KRW",
    renewal_date: "2026-02-25",
    notify_days_before: 2,
    notify_email: true,
    notify_sms: true,
  },
  {
    id: "3",
    name: "ChatGPT Plus",
    amount: 20,
    currency: "USD",
    renewal_date: "2026-02-20",
    notify_days_before: 1,
    notify_email: true,
    notify_sms: false,
  },
];

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const SubscriptionList = () => {
  const [subscriptions] = useState<Subscription[]>(mockSubscriptions);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">구독 서비스</h2>
          <p className="text-sm text-muted-foreground">
            등록된 구독 {subscriptions.length}개
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          구독 추가
        </button>
      </div>

      <div className="grid gap-3">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="glass-card flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                {sub.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-foreground">{sub.name}</p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {formatCurrency(sub.amount, sub.currency)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {sub.renewal_date}
                  </span>
                  <span>{sub.notify_days_before}일 전 알림</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {sub.notify_email && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Email
                  </span>
                )}
                {sub.notify_sms && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    SMS
                  </span>
                )}
              </div>
              <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
