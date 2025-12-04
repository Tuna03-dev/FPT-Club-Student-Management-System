"use client";

import { useEffect, useState } from "react";
import { bannerApi } from "@/api/banner";
import ThumbnailPicker from "@/components/ThumbnailPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, LayoutTemplate, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function BannerAdminPage() {
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const navigate = useNavigate();

  /** Load data ban đầu */
  useEffect(() => {
    bannerApi
      .get()
      .then((r) => setForm(r.data))
      .catch(() => toast.error("Không lấy được banner"))
      .finally(() => setLoading(false));
  }, []);

  /** Update local state */
  const update = (k: string, v: any) =>
    setForm((prev: any) => ({ ...prev, [k]: v }));

  /** Publish */
  const publish = async () => {
    setSaving(true);
    try {
      await bannerApi.update(form);
      toast.success("🎉 Cập nhật banner thành công!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật banner");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form)
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
        <LayoutTemplate className="h-7 w-7 text-primary" />
        Cấu hình Banner trang chủ
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* FORM CONFIG */}
        <Card className="shadow-md border">
          <CardHeader>
            <CardTitle className="text-lg">Thông tin banner</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tiêu đề chính</label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Ví dụ: Hơn 50+ Câu Lạc Bộ"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tiêu đề phụ</label>
              <Input
                value={form.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                placeholder="Một cộng đồng"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nhãn nút CTA</label>
              <Input
                value={form.ctaLabel}
                onChange={(e) => update("ctaLabel", e.target.value)}
                placeholder="Khám phá ngay"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Link khi nhấn CTA</label>
              <Input
                value={form.ctaLink}
                onChange={(e) => update("ctaLink", e.target.value)}
                placeholder="/clubs"
              />
            </div>

            {/* Upload ảnh */}
            <ThumbnailPicker
              value={form.imageUrl}
              onChange={(url) => update("imageUrl", url)}
              label="Ảnh banner (1920x1080 khuyến nghị)"
            />

            <Button
              onClick={publish}
              disabled={saving}
              className="w-full h-10 flex items-center justify-center gap-2 font-semibold"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu & Publish
            </Button>

            {/* nút preview modal */}
            <Button
              type="button"
              variant="secondary"
              className="w-full h-10"
              onClick={() => setPreviewOpen(true)}
            >
              👀 Xem trước toàn màn hình
            </Button>
          </CardContent>
        </Card>

        {/* LIVE PREVIEW TRONG PAGE */}
        <Card className="shadow-md border overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Preview trong trang
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div
              className="relative h-[420px] bg-cover bg-center flex items-center justify-center text-white"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${form.imageUrl}')`,
              }}
            >
              <div className="text-center px-6">
                <h1 className="text-4xl font-extrabold uppercase">
                  {form.title}
                </h1>
                <p className="text-lg opacity-90 mt-3">{form.subtitle}</p>
                <button className="mt-6 px-8 py-3 bg-primary rounded-lg font-semibold shadow">
                  {form.ctaLabel}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL PREVIEW FULL BANNER */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[96vw] p-0 border-0 rounded-md overflow-hidden shadow-2xl">
          <div
            className="relative h-[90vh] bg-cover bg-center flex items-center justify-center text-white"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${form.imageUrl}')`,
            }}
          >
            <div className="text-center px-6 max-w-3xl">
              <h1 className="text-5xl font-black uppercase drop-shadow-lg">
                {form.title}
              </h1>
              <p className="text-xl opacity-90 mt-4 drop-shadow-md">
                {form.subtitle}
              </p>
              <button
                onClick={() => navigate(form.ctaLink)}
                className="mt-8 px-10 py-4 bg-primary rounded-xl text-lg font-semibold shadow"
              >
                {form.ctaLabel}
              </button>
            </div>

            {/* CLOSE */}
            <button
              className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black px-4 py-2 rounded-lg"
              onClick={() => setPreviewOpen(false)}
            >
              ✕ Đóng preview
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
