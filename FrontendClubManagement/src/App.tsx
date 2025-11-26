import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./App.css";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { authService } from "./services/authService";
import { axiosClient } from "./api/axiosClient";

function App() {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {

    const validateToken = async () => {
      const token = localStorage.getItem("accessToken");
      const user = authService.getCurrentUser();


      if (token && user) {
        try {
 
          await axiosClient.get("/auth/validate");
          // Token còn hiệu lực hoặc đã refresh thành công
        } catch {

          console.log("Token validation failed, redirecting to login");
        }
      }
      setIsValidating(false);
    };

    validateToken();
  }, []);


  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: "bg-white text-black",
          style: {
            background: "#fff",
            color: "#000",
          },
        }}
      ></Toaster>
    </>
  );
}

export default App;
