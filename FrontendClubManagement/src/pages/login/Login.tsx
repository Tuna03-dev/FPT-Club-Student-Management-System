import React, { useEffect, useState } from "react";
import { authService } from "../../services/authService";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id:
            import.meta.env.VITE_GOOGLE_CLIENT_ID ||
            "982768167645-ol552hiben0blq9es83e1b2ici5l56nj.apps.googleusercontent.com",
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: false,
        });

        // Render the button
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "vi",
          }
        );
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    if (!response.credential) return;

    setIsLoading(true);
    try {
      const result = await authService.loginWithGoogle(response.credential);
      console.log("Login result:", result);

      if (result.code === 200 && result.data) {
        authService.setTokens(result.data.accessToken);
        authService.setUser(result.data.user);

        navigate("/"); // Redirect to dashboard after successful login
      } else {
        console.error("Login failed:", result.message);
        alert("Đăng nhập thất bại: " + result.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Có lỗi xảy ra khi đăng nhập");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`login-container ${isLoading ? "loading" : ""}`}>
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
          <div id="google-signin-button"></div>
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
