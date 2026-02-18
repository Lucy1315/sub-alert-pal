
-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own notification logs
CREATE POLICY "Users can delete own notification logs"
ON public.notification_logs
FOR DELETE
USING (auth.uid() = user_id);
