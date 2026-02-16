
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  renewal_date DATE NOT NULL,
  notify_days_before INTEGER NOT NULL DEFAULT 3,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  email_recipient TEXT DEFAULT 'onboarding@resend.dev',
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth required per user request)
CREATE POLICY "Allow public read" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.subscriptions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.subscriptions FOR DELETE USING (true);

-- Notification logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  subscription_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  recipient TEXT,
  error_message TEXT,
  test_run BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read logs" ON public.notification_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert logs" ON public.notification_logs FOR INSERT WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
