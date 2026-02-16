import { AppLayout } from "../components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Phone, User } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setPhoneNumber(profile.phone_number || "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, phone_number: phoneNumber })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("프로필이 업데이트되었습니다");
    },
    onError: () => toast.error("업데이트 실패"),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">설정</h2>
          <p className="text-sm text-muted-foreground">프로필 및 알림 설정을 관리합니다</p>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="font-semibold text-foreground">프로필</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">이메일</label>
              <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                {user?.email}
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3" /> 이름
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> 전화번호 (SMS 수신용, E.164 형식)
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+821012345678"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => updateProfile.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              저장
            </button>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">알림 채널</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">📧 이메일 (Resend)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                가입 이메일로 알림이 발송됩니다
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">💬 SMS (NotificationAPI)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                프로필에 등록된 전화번호로 발송됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
