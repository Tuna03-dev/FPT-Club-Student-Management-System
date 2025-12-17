// src/components/finance/PayOSIntegration.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { payosService } from "@/services/payosService";

interface PayOSIntegrationProps {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  setClientId: (value: string) => void;
  setApiKey: (value: string) => void;
  setChecksumKey: (value: string) => void;
  payosLoading: boolean;
  numericClubId: number;
  setPayosLoading: (loading: boolean) => void;
}

export function PayOSIntegration({
  clientId,
  apiKey,
  checksumKey,
  setClientId,
  setApiKey,
  setChecksumKey,
  payosLoading,
  numericClubId,
  setPayosLoading,
}: PayOSIntegrationProps) {
  const handleSaveConfig = async () => {
    if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
    try {
      setPayosLoading(true);
      await payosService.upsertConfig(numericClubId, { clientId, apiKey, checksumKey });
      toast("Đã lưu cấu hình PayOS");
      setApiKey("");
      setChecksumKey("");
    } catch (e) {
      console.error(e);
      toast("Không thể lưu cấu hình");
    } finally {
      setPayosLoading(false);
    }
  };

  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tích hợp PayOS</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Hướng dẫn tích hợp cổng thanh toán PayOS để thu học phí trực tuyến
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-lg">
          <h4 className="font-semibold mb-2">PayOS là gì?</h4>
          <p className="text-sm text-muted-foreground">
            PayOS là nền tảng thanh toán trực tuyến giúp CLB thu học phí, phí sự kiện một
            cách tự động và an toàn. Hỗ trợ nhiều phương thức thanh toán: chuyển khoản
            ngân hàng, ví điện tử, QR Code.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Các bước tích hợp PayOS:</h4>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h5 className="font-medium mb-2">Đăng ký tài khoản PayOS</h5>
                <p className="text-sm text-muted-foreground mb-2">
                  Truy cập trang web PayOS và đăng ký tài khoản merchant
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://payos.vn" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Truy cập PayOS
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h5 className="font-medium mb-2">Lấy API Keys</h5>
                <p className="text-sm text-muted-foreground mb-2">
                  Sau khi đăng ký, vào phần Settings → API Keys để lấy:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Client ID</li>
                  <li>• API Key</li>
                  <li>• Checksum Key</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h5 className="font-medium mb-2">Cấu hình trên FCM</h5>
                <p className="text-sm text-muted-foreground mb-2">
                  Sau khi có API keys, bạn cần:
                </p>
                <div className="space-y-2">
                  <div className="bg-secondary/30 p-3 rounded-md">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Client ID
                    </Label>
                    <Input
                      placeholder="Nhập Client ID từ PayOS"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    />
                  </div>
                  <div className="bg-secondary/30 p-3 rounded-md">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      API Key
                    </Label>
                    <Input
                      type="password"
                      placeholder="Nhập API Key từ PayOS"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="bg-secondary/30 p-3 rounded-md">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Checksum Key
                    </Label>
                    <Input
                      type="password"
                      placeholder="Nhập Checksum Key từ PayOS"
                      value={checksumKey}
                      onChange={(e) => setChecksumKey(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full mt-2"
                    disabled={payosLoading || !clientId || !apiKey || !checksumKey}
                    onClick={handleSaveConfig}
                  >
                    {payosLoading ? "Đang lưu…" : "Lưu cấu hình"}
                  </Button>
                  
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h5 className="font-medium mb-2">Kiểm tra tích hợp</h5>
                <p className="text-sm text-muted-foreground mb-2">
                  Sau khi cấu hình xong, hệ thống sẽ tự động:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Tạo link thanh toán cho từng khoản phí</li>
                  <li>• Cập nhật trạng thái thanh toán tự động khi thành viên đóng phí</li>
                  <li>• Gửi thông báo cho thành viên và quản trị viên</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded-r-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Lưu ý quan trọng
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Cần xác minh danh tính doanh nghiệp/tổ chức để sử dụng PayOS</li>
            <li>• PayOS tính phí giao dịch khoảng 1.5% - 3% tùy phương thức thanh toán</li>
            <li>• Thời gian rút tiền về tài khoản: T+1 đến T+3 ngày làm việc</li>
          </ul>
        </div>

        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <h4 className="font-medium mb-1">Tài liệu API PayOS</h4>
            <p className="text-sm text-muted-foreground">
              Xem tài liệu chi tiết về API và tích hợp PayOS
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="https://payos.vn/docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Xem tài liệu
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}