import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CreditCard } from "lucide-react";

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const UpcomingRenewals = () => {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const { data: subscriptions } = useQuery({
    queryKey: ["upcoming-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "active")
        .gte("renewal_date", today)
        .lte("renewal_date", nextWeekStr)
        .order("renewal_date");
      if (error) throw error;
      return data;
    },
  });

  if (!subscriptions?.length) return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-semibold text-foreground">7일 이내 결제 예정</h3>
      </div>
      <div className="divide-y divide-border/50">
        {subscriptions.map((sub) => {
          const daysLeft = Math.ceil(
            (new Date(sub.renewal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return (
            <div key={sub.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {sub.service_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{sub.service_name}</p>
                  <p className="text-xs text-muted-foreground">{sub.plan_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  {formatCurrency(sub.price, sub.currency)}
                </span>
                <span className={`flex items-center gap-1 font-medium ${daysLeft <= 1 ? "text-destructive" : daysLeft <= 3 ? "text-warning" : "text-muted-foreground"}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {daysLeft === 0 ? "오늘" : `${daysLeft}일 후`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
