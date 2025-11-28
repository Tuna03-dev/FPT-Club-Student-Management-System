// src/pages/HomePage.tsx
import React, { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  AlertTriangle,
  Newspaper,
  CalendarDays,
  Users,
  ArrowUpRight,
} from "lucide-react";

import { getHomepageData } from "../api/homepageApi";
import type { HomepageData } from "../types/homepage";

import { getAllNewsByFilter } from "../service/NewsService";
import { getAllEventsByFilter } from "../service/EventService";
import { getPublicClubs } from "../api/publicClubs";

import type { NewsFilterRequest } from "../service/NewsService";
import type { EventFilterRequest } from "../service/EventService";
import type { ClubCard, PageResp } from "@/types/publicClub";

import SpotlightSection from "../components/homepage/Spotlight";
import UpcomingEvents from "../components/homepage/UpcomingEvents";
import FeaturedClubs from "../components/homepage/FeaturedClubs";
import LatestNews from "../components/homepage/LatestNews";

/* ===========================
   TYPES DÙNG CHO GỢI Ý SEARCH
   =========================== */
type SearchResultType = "news" | "club" | "event";

interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  url: string;
}

/* ===========================
   HELPERS
   =========================== */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;

  const regex = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <span key={idx} className="font-semibold text-[#ff6b35]">
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

/* ============================================
   GỌI API → GHÉP → MATCH THEO NHIỀU FIELD
   ============================================ */
async function searchHomepageApi(keyword: string): Promise<SearchResultItem[]> {
  const q = keyword.trim().toLowerCase();
  if (!q) return [];

  const newsReq: NewsFilterRequest = { keyword: q, page: 1, size: 5 };
  const eventReq: EventFilterRequest = { keyword: q, page: 1, size: 5 };

  const [newsResp, eventResp, clubResp] = await Promise.all([
    getAllNewsByFilter(newsReq).catch(() => ({
      data: [],
      total: 0,
      count: 0,
    })),
    getAllEventsByFilter(eventReq).catch(() => ({
      data: [],
      total: 0,
      count: 0,
    })),
    getPublicClubs({ q, page: 0, size: 5 }).catch(() => {
      const empty: PageResp<ClubCard> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 0,
        first: true,
        last: true,
      };
      return empty;
    }),
  ]);

  const results: SearchResultItem[] = [];

  /* -------- NEWS -------- */
  for (const n of newsResp.data ?? []) {
    const subtitleParts = [n.newsType, n.clubName].filter(Boolean);
    const subtitle = subtitleParts.join(" • ").trim();

    const combined = `${n.title ?? ""} ${subtitle}`.toLowerCase();
    if (!combined.includes(q)) continue;

    results.push({
      id: String(n.id),
      type: "news",
      title: n.title,
      subtitle,
      url: `/news/${n.id}`,
    });
  }

  /* -------- EVENTS -------- */
  // ===== EVENTS =====
  for (const e of eventResp.data ?? []) {
    const subtitleParts: string[] = [];
    if (e.clubName) subtitleParts.push(e.clubName);
    if (e.eventTypeName) subtitleParts.push(e.eventTypeName); // ✅ dùng eventTypeName
    if (e.startTime) {
      const d = new Date(e.startTime);
      subtitleParts.push(
        d.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }

    const subtitle = subtitleParts.join(" • ").trim();
    const combined = `${e.title ?? ""} ${subtitle}`.toLowerCase();
    if (!combined.includes(q)) continue;

    results.push({
      id: String(e.id),
      type: "event",
      title: e.title,
      subtitle,
      url: `/events/${e.id}`,
    });
  }

  /* -------- CLUBS -------- */
  for (const c of clubResp.content ?? []) {
    const subtitleParts = [c.categoryName, c.campusName].filter(Boolean);
    const subtitle = subtitleParts.join(" • ").trim();

    const combined = `${c.clubName ?? ""} ${subtitle}`.toLowerCase();
    if (!combined.includes(q)) continue;

    results.push({
      id: String(c.id),
      type: "club",
      title: c.clubName,
      subtitle,
      url: `/clubs/${c.id}`,
    });
  }

  return results;
}

/* =====================
   COMPONENT HOME PAGE
   ===================== */
const HomePage: React.FC = () => {
  const [data, setData] = useState<HomepageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SEARCH
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const navigate = useNavigate();

  /* LOADING HOMEPAGE DATA */
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const homepageData = await getHomepageData();
      setData(homepageData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSkeleton = loading && !data;

  /* SEARCH DEBOUNCE */
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setActiveIndex(-1);
      return;
    }

    try {
      setSearchError(null);
      setSearchLoading(true);
      const results = await searchHomepageApi(q);
      setSearchResults(results);
      setActiveIndex(results.length ? 0 : -1);
    } catch {
      setSearchError("Không thể tìm kiếm. Vui lòng thử lại.");
      setSearchResults([]);
      setActiveIndex(-1);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = window.setTimeout(() => performSearch(searchTerm), 350);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, performSearch]);

  /* ARROW KEYS */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < searchResults.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : searchResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        const item = searchResults[activeIndex];
        navigate(item.url);
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const handleSelectResult = (item: SearchResultItem, index: number) => {
    setActiveIndex(index);
    navigate(item.url);
    setIsFocused(false);
  };

  /* GROUPED RESULTS */
  const grouped = {
    news: searchResults.filter((r) => r.type === "news"),
    event: searchResults.filter((r) => r.type === "event"),
    club: searchResults.filter((r) => r.type === "club"),
  };

  const typeIconMap: Record<SearchResultType, React.ReactNode> = {
    news: <Newspaper className="w-4 h-4" />,
    club: <Users className="w-4 h-4" />,
    event: <CalendarDays className="w-4 h-4" />,
  };

  const showDropdown =
    isFocused &&
    searchTerm.trim().length > 0 &&
    (searchLoading || searchResults.length > 0 || searchError);

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section
        className="text-white py-20 md:py-32 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070')",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide">
            Hơn 50+ Câu Lạc Bộ
          </h1>
          <h2 className="text-4xl md:text-6xl font-black uppercase text-[#ff6b35]">
            Một Cộng Đồng
          </h2>

          {/* SEARCH BOX */}
          <div className="mt-8 max-w-2xl mx-auto relative">
            <div className="relative flex items-center mx-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                onKeyDown={handleKeyDown}
                placeholder="Tìm kiếm câu lạc bộ, sự kiện, tin tức..."
                className="w-full pl-5 pr-36 py-3 rounded-full bg-white text-gray-800 shadow-lg border border-white/40 focus:ring-2 focus:ring-[#ff6b35]"
              />

              <button
                type="button"
                onClick={() => {
                  if (searchTerm.trim()) performSearch(searchTerm);
                }}
                className="absolute right-2 px-6 py-2 rounded-full bg-[#ff6b35] text-white shadow-md flex items-center gap-2 hover:bg-[#e55a2b]"
              >
                <Search className="w-5 h-5" />
                Tìm kiếm
              </button>
            </div>

            {/* DROPDOWN */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.25)] max-h-96 overflow-y-auto z-20 border border-slate-100 text-gray-800">
                {searchLoading && (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-[#ff6b35] animate-spin" />
                    <span>Đang tìm kiếm...</span>
                  </div>
                )}

                {searchError && !searchLoading && (
                  <div className="px-4 py-3 text-sm text-red-600">
                    {searchError}
                  </div>
                )}

                {!searchLoading &&
                  !searchError &&
                  searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Không tìm thấy kết quả phù hợp.
                    </div>
                  )}

                {!searchLoading && !searchError && searchResults.length > 0 && (
                  <>
                    {(
                      [
                        ["news", "Tin tức"],
                        ["event", "Sự kiện"],
                        ["club", "Câu lạc bộ"],
                      ] as [SearchResultType, string][]
                    ).map(([type, label]) => {
                      const items = grouped[type];
                      if (!items.length) return null;

                      return (
                        <div
                          key={type}
                          className="border-t border-slate-100 first:border-t-0"
                        >
                          <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {typeIconMap[type]}
                              <span>{label}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {items.length}
                            </span>
                          </div>

                          <div className="pb-1">
                            {items.map((item) => {
                              const flatIndex = searchResults.indexOf(item);
                              const isActive = flatIndex === activeIndex;

                              return (
                                <button
                                  key={`${item.type}-${item.id}`}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setActiveIndex(flatIndex)}
                                  onClick={() =>
                                    handleSelectResult(item, flatIndex)
                                  }
                                  className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                                    isActive
                                      ? "bg-slate-100"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <Search className="w-4 h-4 text-slate-400 mt-1" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {highlightMatch(item.title, searchTerm)}
                                      </div>

                                      {item.subtitle && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {highlightMatch(
                                            item.subtitle,
                                            searchTerm
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>
                        Dùng <b>↑ ↓ Enter</b> để chọn.
                      </span>
                      <span className="hidden sm:inline">
                        Nhấn <b>Esc</b> để đóng.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        {error && (
          <div className="mb-8 border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        )}

        {showSkeleton && (
          <div className="text-center py-16">
            <div className="h-12 w-12 border-b-2 border-[#ff6b35] animate-spin mx-auto rounded-full" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu trang chủ...</p>
          </div>
        )}

        {/* RENDER MAIN SECTIONS */}
        {data && (
          <>
            <SpotlightSection spotlight={data.spotlight} />

            <section className="mt-16">
              <h2 className="text-3xl font-bold text-center mb-12">
                Có Gì Hot Tuần Này?
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <UpcomingEvents events={data.upcomingEvents} />
                <LatestNews news={data.latestNews} />
              </div>
            </section>

            <FeaturedClubs clubs={data.featuredClubs} />
          </>
        )}

        {!data && !showSkeleton && (
          <div className="mt-20 flex flex-col items-center text-center space-y-6 text-gray-600 pb-20">
            <img
              src="/default-fallback-image.png" // đổi theo file bạn để trong public
              alt="Hệ thống đang tạm gián đoạn"
              className="w-72 sm:w-80 md:w-96 mx-auto opacity-90 drop-shadow-md"
            />

            <p className="text-xl font-semibold text-gray-800">
              Vui Lòng đợi phản hồi từ hệ thống
            </p>

            <p className="max-w-xl text-gray-500">
              Máy chủ hoặc cơ sở dữ liệu hiện đang không phản hồi. Bạn có thể
              thử lại sau hoặc điều hướng sang các trang khác bằng menu phía
              trên.
            </p>
          </div>
        )}

        <section className="mt-16 bg-[#ff6b35] rounded-2xl py-16 px-4 text-center text-white">
          <h2 className="text-3xl font-bold">Sẵn sàng để tham gia?</h2>
          <p className="mt-2 text-lg opacity-90">
            Trở thành một phần của cộng đồng sinh viên FPT ngay hôm nay.
          </p>
          <a
            href="/clubs"
            className="inline-block mt-6 bg-white text-[#ff6b35] px-8 py-3 rounded-lg font-bold hover:bg-gray-100"
          >
            Xem Danh Sách Câu Lạc Bộ
          </a>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
