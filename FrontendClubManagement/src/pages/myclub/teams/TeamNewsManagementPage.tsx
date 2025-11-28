"use client";

import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import TeamNewsDrafts from "../../news/TeamNewsDrafts";
import TeamNewsRequests from "../../news/TeamNewsRequests";
import { FileText, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ===================== PAGE ===================== */
export default function TeamNewsManagementPage() {
  const nav = useNavigate();
  const { clubId, teamId } = useParams();
  const cId = Number(clubId ?? "0");
  const tId = Number(teamId ?? "0");

  const { isTeamOfficer, loading } = useClubPermissions(cId);
  const [sp, setSp] = useSearchParams();

  // 🔥 DEFAULT TAB = "requests"
  const tab = (sp.get("tab") as "drafts" | "requests") || "requests";

  useEffect(() => {
    if (!loading && !isTeamOfficer) {
      toast.error("Bạn không có quyền truy cập trang này.");
      nav(`/myclub/${cId}/teams/${tId}`, { replace: true });
    }
  }, [loading, isTeamOfficer]);

  if (loading) return <div className="p-6">Đang kiểm tra quyền…</div>;
  if (!isTeamOfficer) return null;

  const switchTab = (id: "drafts" | "requests") => {
    const next = new URLSearchParams(sp);
    next.set("tab", id);
    setSp(next, { replace: true });
  };

  const TABS = [
    { id: "requests", label: "Tin tức chờ duyệt", icon: Clock },
    { id: "drafts", label: "Bản nháp tin tức", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* 🔻 GIẢM LỀ: max-w-5xl */}
      <div className="w-full pl-6 pr-6">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">TIN TỨC</h1>
          <p className="text-muted-foreground">
            Quản lý tin tức và yêu cầu từ phòng ban
          </p>
        </div>

        {/* TABS + ACTION */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Tabs value={tab} onValueChange={(v) => switchTab(v as any)}>
            <TabsList className="grid w-max grid-cols-2 gap-2">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  <t.icon className="w-4 h-4 mr-1" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* LUÔN HIỂN THỊ */}
          <Button
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => nav(`/myclub/${cId}/teams/${tId}/news-editor`)}
          >
            <Plus className="h-4 w-4" /> Tạo tin tức
          </Button>
        </div>

        {/* CONTENT */}
        <section className="space-y-3">
          {tab === "drafts" && <TeamNewsDrafts />}
          {tab === "requests" && <TeamNewsRequests />}
        </section>
      </div>
    </div>
  );
}
