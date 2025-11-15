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
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const navigate = useNavigate();
  const googleInitialized = useRef(false);

  useEffect(() => {
    // Check if we're returning from OAuth callback
    const hash = window.location.hash;
    if (hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      const returnedNonce = params.get("nonce");
      
      // Verify nonce
      const storedNonce = sessionStorage.getItem("google_oauth_nonce");
      if (idToken && returnedNonce === storedNonce) {
        // Clear URL hash
        window.history.replaceState(null, "", window.location.pathname);
        
        // Send message to opener window if this is a popup callback
        if (window.opener) {
          window.opener.postMessage(
            { type: "GOOGLE_OAUTH_CALLBACK", idToken },
            window.location.origin
          );
          window.close();
        } else {
          // Process directly if opened in same window
          handleCredentialResponse({ credential: idToken });
        }
      }
      
      // Clean up
      sessionStorage.removeItem("google_oauth_nonce");
      sessionStorage.removeItem("google_oauth_state");
    }
    
    // Mark Google as ready (we don't need the script for OAuth flow)
    setIsGoogleReady(true);
    googleInitialized.current = true;
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
        const { accessToken, user } = result.data;
        authService.setTokens(accessToken);
        authService.setUser(user);

        // Dispatch custom event to notify Header about auth state change
        window.dispatchEvent(new Event("auth-state-changed"));

        toast.success("Đăng nhập thành công!", { duration: 2000 });
        const normalizedSystemRole = user?.systemRole
          ? String(user.systemRole).trim().toUpperCase()
          : "";

        if (normalizedSystemRole === "STAFF") {
          navigate("/staff/events", { replace: true });
        } else {
          navigate("/"); // Redirect to homepage after successful login
        }
      } else if (result.code === 403) {
        toast.error("Tài khoản của bạn không thuộc tổ chức của chúng tôi");
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
    // Use Google OAuth 2.0 Implicit Flow with popup
    // This is the most reliable method that works in all environments
    // It opens Google's account picker in a popup window
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "982768167645-ol552hiben0blq9es83e1b2ici5l56nj.apps.googleusercontent.com";
    
    // Use a dedicated callback page to handle OAuth redirect
    const redirectUri = `${window.location.origin}/google-oauth-callback.html`;
    const scope = "openid email profile";
    const responseType = "id_token";
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store nonce in sessionStorage for verification
    sessionStorage.setItem("google_oauth_nonce", nonce);
    sessionStorage.setItem("google_oauth_state", "login");
    
    // Build OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", responseType);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("prompt", "select_account"); // Show account picker
    
    // Calculate popup position (center of screen)
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open popup window
    const popup = window.open(
      authUrl.toString(),
      "Google Sign-In",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    if (!popup) {
      toast.error("Trình duyệt đã chặn popup. Vui lòng cho phép popup và thử lại.");
      return;
    }
    
    // Focus popup
    popup.focus();
    
    // Poll to check if popup was closed manually or check for redirect
    let pollTimer: NodeJS.Timeout | null = null;
    
    // Listen for OAuth callback via postMessage
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }
      
      if (event.data?.type === "GOOGLE_OAUTH_CALLBACK") {
        window.removeEventListener("message", handleMessage);
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        popup?.close();
        
        const idToken = event.data.idToken;
        if (idToken) {
          // Process the ID token
          await handleCredentialResponse({ credential: idToken });
        } else {
          toast.error("Đăng nhập bị hủy hoặc có lỗi xảy ra.");
        }
      }
    };
    
    window.addEventListener("message", handleMessage);
    
    // Start polling
    pollTimer = setInterval(() => {
      if (popup.closed) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        window.removeEventListener("message", handleMessage);
        // User closed popup manually - don't show error
        return;
      }
      
      // Try to access popup location (may fail due to CORS, that's ok)
      try {
        if (popup.location.href.includes(window.location.origin)) {
          // Popup has redirected to our site
          const hash = popup.location.hash;
          if (hash.includes("id_token=")) {
            const params = new URLSearchParams(hash.substring(1));
            const idToken = params.get("id_token");
            const returnedNonce = params.get("nonce");
            
            // Verify nonce
            const storedNonce = sessionStorage.getItem("google_oauth_nonce");
            if (idToken && returnedNonce === storedNonce) {
              if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
              }
              window.removeEventListener("message", handleMessage);
              popup.close();
              
              // Process the ID token
              handleCredentialResponse({ credential: idToken });
            }
          }
        }
      } catch (e) {
        // CORS error - popup is still on Google's domain, that's expected
        // The callback page will send postMessage when it loads
      }
    }, 500);
  };

  return (
    <div className={`login-container ${isLoading ? "loading" : ""}`}>
      {/* Back Button */}
      <button
        className="back-button"
        onClick={() => navigate("/")}
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
            disabled={isLoading || !isGoogleReady}
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
