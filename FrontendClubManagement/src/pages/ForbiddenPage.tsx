export default function ForbiddenPage() {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center">
      <div className="text-4xl mb-3">🚫</div>
      <h1 className="text-lg font-semibold mb-1">Bạn không có quyền truy cập trang này</h1>
      <p className="text-sm text-muted-foreground">
        Vui lòng liên hệ Chủ nhiệm/Phó chủ nhiệm CLB nếu bạn nghĩ đây là nhầm lẫn.
      </p>
    </div>
  );
}
