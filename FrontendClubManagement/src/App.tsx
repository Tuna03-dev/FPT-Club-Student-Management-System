import "./App.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { Toaster } from "sonner";
function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
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
