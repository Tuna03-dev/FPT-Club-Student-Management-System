import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Loading state - Show skeleton of the recruitment management page
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Search and Filters Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[180px]" />
            </div>

            {/* Recruitment Cards Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Title */}
                        <Skeleton className="h-5 w-3/4" />
                        {/* Badges */}
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-20 rounded-full" />
                          {index === 1 && <Skeleton className="h-5 w-32 rounded-full" />}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Description - 3 lines */}
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>

                      {/* Grid stats - 2x2 */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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
