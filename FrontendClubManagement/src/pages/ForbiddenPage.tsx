"use client";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-800/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          {/* <div className="inline-block mb-6 px-4 py-2 bg-red-900/30 border border-red-700/50 rounded-lg">
            <span className="text-red-200 text-sm font-semibold tracking-wider">
              ERROR 403
            </span>
          </div> */}

          <h1 className="text-5xl md:text-6xl font-bold text-slate-100 mb-4 text-balance">
            Không có quyền truy cập
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-8 text-pretty">
            Bạn không được phép truy cập vào trang này. Vui lòng kiểm tra lại
            quyền hạn hoặc liên hệ với quản trị viên hệ thống.
          </p>
        </div>

        {/* Content Card Section */}
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 md:p-12 mb-12">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center shadow-2xl">
              <svg
                className="w-12 h-12 text-orange-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c.866.866 2.291 1.126 4.282.906a119.232 119.232 0 001.469-.25c.668-.087 1.186.265 1.378.787l.821 4.127a49.52 49.52 0 00-5.076-.482c-1.917-.184-3.427.992-4.251 2.853M12 12a9 9 0 100-18 9 9 0 000 18zm-9 36h18a9 9 0 009-9V6a9 9 0 00-9-9H3a9 9 0 00-9 9v42a9 9 0 009 9z"
                />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Truy cập bị từ chối
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Trang này chỉ dành cho những người dùng được phép. Nếu bạn cho
              rằng đây là một lỗi, vui lòng liên hệ với Ban quản trị hoặc Chủ
              nhiệm để được hỗ trợ.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => window.history.back()}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              ← Quay lại trang trước
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              → Về trang chủ
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-slate-400">
          <p>
            Cần hỗ trợ? Liên hệ:
            <span className="text-orange-300 font-semibold ml-2">
              hoangnhhe172374@fpt.edu.vn
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
