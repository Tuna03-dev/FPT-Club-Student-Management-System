import type React from "react"
import { Outlet } from "react-router-dom"
import Header from "../components/common/Header"
import Footer from "../components/common/Footer"

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout
