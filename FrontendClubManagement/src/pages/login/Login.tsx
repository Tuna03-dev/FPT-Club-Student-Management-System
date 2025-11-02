import React, { useEffect, useState, useRef } from "react";
import { authService } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import "./Login.css";
import logoImage from "@/assets/Logo_FPT_Education.png";

declare global {
  interface Window {
    google: any;
  }
}

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google && !googleInitialized.current) {
        window.google.accounts.id.initialize({
          client_id:
            import.meta.env.VITE_GOOGLE_CLIENT_ID ||
            "982768167645-ol552hiben0blq9es83e1b2ici5l56nj.apps.googleusercontent.com",
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: false,
        });
        googleInitialized.current = true;

        // Pre-render Google button in hidden container for programmatic triggering
        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "vi",
          });
        }
      }
    };

    return () => {
      const existingScript = document.head.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    if (!response.credential) {
      toast.error("Lỗi xác thực Google");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.loginWithGoogle(response.credential);
      console.log("Login result:", result);

      if (result.code === 200 && result.data) {
        authService.setTokens(result.data.accessToken);
        authService.setUser(result.data.user);

        // Dispatch custom event to notify Header about auth state change
        window.dispatchEvent(new Event("auth-state-changed"));

        toast.success("Đăng nhập thành công!", { duration: 2000 });
        navigate("/"); // Redirect to dashboard after successful login
      } else {
        console.error("Login failed:", result.message);
        toast.error("Đăng nhập không thành công");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Check if it's a Google authentication error or login API error
      if (error instanceof Error && error.message.includes("credential")) {
        toast.error("Lỗi xác thực Google");
      } else {
        toast.error("Đăng nhập không thành công");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGoogleSignIn = () => {
    if (!window.google || !googleInitialized.current) {
      toast.error("Google Sign-In chưa sẵn sàng. Vui lòng thử lại sau.");
      return;
    }

    if (!googleButtonRef.current) return;

    // Find the pre-rendered Google button and trigger it
    const googleButton = googleButtonRef.current.querySelector(
      "div[role='button'], button, iframe, .gsi-material-button"
    ) as HTMLElement;

    if (googleButton) {
      // Try to click the button directly
      googleButton.click();
    } else {
      // Fallback: try to show One Tap prompt
      window.google.accounts.id.prompt((notification: any) => {
        if (
          notification.isNotDisplayed() ||
          notification.isSkippedMoment() ||
          notification.isDismissedMoment()
        ) {
          // If prompt doesn't work, re-render button and try again
          googleButtonRef.current!.innerHTML = "";
          window.google.accounts.id.renderButton(googleButtonRef.current!, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "vi",
          });

          setTimeout(() => {
            const renderedButton = googleButtonRef.current?.querySelector(
              "div[role='button'], button, iframe, .gsi-material-button"
            ) as HTMLElement;
            if (renderedButton) {
              renderedButton.click();
            } else {
              toast.error(
                "Không thể hiển thị cửa sổ đăng nhập Google. Vui lòng tải lại trang và thử lại."
              );
            }
          }, 200);
        }
      });
    }
  };

  return (
    <div className={`login-container ${isLoading ? "loading" : ""}`}>
      {/* Back Button */}
      <button
        className="back-button"
        onClick={() => navigate(-1)}
        aria-label="Quay lại"
      >
        <ArrowLeft size={20} />
        <span>Quay lại</span>
      </button>

      <div className="login-card">
        {/* Logo */}
        <div className="logo-container">
          <div>
            <img src={logoImage} alt="logo" />
          </div>
        </div>

        <h1 className="main-title">Hệ thống Quản lý Câu lạc bộ</h1>

        <div className="subtitle-tag">
          <span>Đại học FPT</span>
        </div>

        <p className="description">
          Kết nối sinh viên, quản lý hoạt động và phát triển cộng đồng câu lạc
          bộ
        </p>

        <div className="google-login-container">
          <button
            className="custom-google-button"
            onClick={triggerGoogleSignIn}
            disabled={isLoading}
            type="button"
          >
            <svg
              className="google-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Đăng nhập bằng Google</span>
          </button>
          {/* Off-screen container for Google button rendering (not hidden completely to allow programmatic clicks) */}
          <div
            ref={googleButtonRef}
            style={{
              position: "absolute",
              left: "-9999px",
              top: "-9999px",
              width: "100%",
              opacity: 0,
              pointerEvents: "none",
            }}
            id="google-signin-button"
            aria-hidden="true"
          ></div>
        </div>

        <p className="instruction">
          Sử dụng tài khoản Google <b>@fpt.edu.vn</b> của bạn để truy cập hệ
          thống
        </p>

        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
