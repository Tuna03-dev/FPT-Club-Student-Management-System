import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, UserX, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClubPermissions } from "@/hooks/useClubPermissions";

interface ClubPermissionGuardProps {
  clubId: number | undefined;
  children: ReactNode;
}

/**
 * Component to protect routes that require CLUB_PRESIDENT role
 */
export function ClubPermissionGuard({
  clubId,
  children,
}: ClubPermissionGuardProps) {
  const navigate = useNavigate();
  const { isClubPresident, isClubMember, hasPermission, loading, user } =
    useClubPermissions(clubId);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // No user found
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">
              Chưa đăng nhập
            </h2>
            <p className="text-muted-foreground mb-6">
              Vui lòng đăng nhập để truy cập trang này
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User doesn't have permission
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-orange-200">
          <CardContent className="pt-12 pb-12">
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-orange-100 p-3">
                  <ShieldAlert className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                Không có quyền truy cập
              </h2>
              <p className="text-muted-foreground">
                Bạn không có quyền truy cập vào trang quản lý tuyển dụng
              </p>
            </div>

            {/* Show specific reason */}
            <div className="space-y-3 mb-6">
              {!isClubMember && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-orange-800 mb-1">
                        Không phải thành viên của câu lạc bộ
                      </h4>
                      <p className="text-sm text-orange-700">
                        Bạn không phải là thành viên của câu lạc bộ này.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isClubMember && !isClubPresident && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-orange-800 mb-1">
                        Không có vai trò Chủ tịch CLB
                      </h4>
                      <p className="text-sm text-orange-700">
                        Bạn cần có vai trò <strong>CLUB_PRESIDENT</strong> (Chủ tịch
                        câu lạc bộ) trong câu lạc bộ này để quản lý tuyển dụng.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 flex items-center justify-center text-blue-600 mt-0.5 flex-shrink-0 font-bold">
                    💡
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">
                      Yêu cầu quyền truy cập
                    </h4>
                    <p className="text-sm text-blue-700">
                      Để truy cập trang quản lý tuyển dụng, bạn cần:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>
                        Là thành viên đang hoạt động của câu lạc bộ
                      </li>
                      <li>
                        Có vai trò <strong>CLUB_PRESIDENT</strong> (Chủ tịch CLB) trong câu lạc bộ
                      </li>
                    </ul>
                    <p className="text-sm text-blue-600 mt-3">
                      Vui lòng liên hệ với quản trị viên hệ thống hoặc chủ tịch
                      câu lạc bộ để được cấp quyền.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Quay lại
              </Button>
              <Button onClick={() => navigate("/")}>Về trang chủ</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has permission, render children
  return <>{children}</>;
}
