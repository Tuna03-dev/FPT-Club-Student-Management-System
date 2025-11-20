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

  return parts.map((part, idx) => {
    if (part.toLowerCase() === q.toLowerCase()) {
      return (
        <span key={idx} className="font-semibold text-[#ff6b35]">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/* ============================================
   GỌI 3 API CŨ → GHÉP KẾT QUẢ → TRẢ GỢI Ý SEARCH
   ============================================ */
async function searchHomepageApi(keyword: string): Promise<SearchResultItem[]> {
  const q = keyword.trim();
  if (!q) return [];

  // ✅ page = 1 để khớp với backend
  const newsReq: NewsFilterRequest = { keyword: q, page: 1, size: 5 };
  const eventReq: EventFilterRequest = { keyword: q, page: 1, size: 5 };

  const [newsResp, eventResp, clubResp] = await Promise.all([
    getAllNewsByFilter(newsReq).catch((err) => {
      console.error("NEWS FILTER ERROR:", err.response?.data || err);
      return { data: [], total: 0, count: 0 };
    }),
    getAllEventsByFilter(eventReq).catch((err) => {
      console.error("EVENT FILTER ERROR:", err.response?.data || err);
      return { data: [], total: 0, count: 0 };
    }),
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

  // ===== Map NEWS =====
  for (const n of newsResp.data ?? []) {
    const subtitleParts: string[] = [];
    if (n.newsType) subtitleParts.push(n.newsType);
    if (n.clubName) subtitleParts.push(n.clubName);

    results.push({
      id: String(n.id),
      type: "news",
      title: n.title,
      subtitle: subtitleParts.join(" • "),
      url: `/news/${n.id}`,
    });
  }

  // ===== Map EVENTS =====
  for (const e of eventResp.data ?? []) {
    const subtitleParts: string[] = [];
    if (e.clubName) subtitleParts.push(e.clubName);
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

    results.push({
      id: String(e.id),
      type: "event",
      title: e.title,
      subtitle: subtitleParts.join(" • "),
      url: `/events/${e.id}`,
    });
  }

  // ===== Map CLUBS =====
  for (const c of clubResp.content ?? []) {
    const subtitleParts: string[] = [];
    if (c.categoryName) subtitleParts.push(c.categoryName);
    if (c.campusName) subtitleParts.push(c.campusName);

    results.push({
      id: String(c.id),
      type: "club",
      title: c.clubName,
      subtitle: subtitleParts.join(" • "),
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

  // SEARCH STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const homepageData = await getHomepageData();
      setData(homepageData);
    } catch (err) {
      console.error(err);
      setError(
        "Không thể tải dữ liệu trang chủ. Có thể hệ thống đang bảo trì."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSkeleton = loading && !data;

  /* ====== Gọi API search (debounce) ====== */
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
    } catch (err) {
      console.error(err);
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
      setActiveIndex(-1);
      return;
    }
    const timeout = window.setTimeout(() => performSearch(searchTerm), 350);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, performSearch]);

  /* ====== Keyboard navigation ====== */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < searchResults.length) {
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

  /* ====== Grouping theo type để UI đẹp hơn ====== */
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

  /* ===========================
     RENDER
     =========================== */
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
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
          <p className="mt-4 text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Tìm kiếm đam mê và kết nối với bạn bè tại Đại học FPT Hà Nội.
          </p>

          {/* SEARCH BOX + DROPDOWN */}
          <div className="mt-8 max-w-2xl mx-auto relative">
            {/* card nền mờ để search + gợi ý không bị chìm */}
            <div className="relative flex items-center mx-auto w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                onKeyDown={handleKeyDown}
                placeholder="Tìm kiếm câu lạc bộ, sự kiện, tin tức..."
                className="
        w-full pl-5 pr-36 py-3 rounded-full
        bg-white text-gray-800 placeholder-gray-500
        shadow-lg shadow-black/20
        border border-white/40
        focus:outline-none focus:ring-2 focus:ring-[#ff6b35]
      "
              />

              <button
                type="button"
                onClick={() => {
                  if (searchTerm.trim()) {
                    setIsFocused(true);
                    performSearch(searchTerm);
                  }
                }}
                className="
        absolute right-2 px-6 py-2 rounded-full font-semibold
        bg-[#ff6b35] text-white
        hover:bg-[#e55a2b] transition-colors
        shadow-md
        flex items-center gap-2
      "
              >
                <Search className="w-5 h-5" />
                Tìm kiếm
              </button>
            </div>

            {/* TAG GỢI Ý — tách riêng, nhẹ nhàng */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
              <span className="font-semibold text-white/80 mr-2">Gợi ý:</span>

              {["Tình nguyện", "Lập trình", "Âm nhạc", "Workshop"].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchTerm(tag);
                      setIsFocused(true);
                      performSearch(tag);
                    }}
                    className="
            bg-white/25 text-white backdrop-blur
            px-3 py-1 rounded-full hover:bg-white/35
            transition shadow
          "
                  >
                    {tag}
                  </button>
                )
              )}
            </div>

            {/* GOOGLE-LIKE DROPDOWN */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.25)] max-h-96 overflow-y-auto z-20 text-gray-800 border border-slate-100">
                {/* trạng thái loading / error / empty */}
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

                {/* kết quả theo nhóm */}
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
                          <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center justify-between">
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
                                  className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                                    isActive
                                      ? "bg-slate-100"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 text-slate-400">
                                      <Search className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                                        {highlightMatch(item.title, searchTerm)}
                                      </div>
                                      {item.subtitle && (
                                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                          {item.subtitle}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowUpRight className="w-4 h-4 text-slate-300 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* hint dưới cùng */}
                    <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>
                        Dùng <span className="font-semibold">↑ ↓ Enter</span> để
                        chọn kết quả.
                      </span>
                      <span className="hidden sm:inline">
                        Nhấn <span className="font-semibold">Esc</span> để đóng.
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
        {/* ERROR */}
        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-1.5 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* LOADING PAGE */}
        {showSkeleton && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto" />
              <p className="mt-4 text-gray-600">
                Đang tải dữ liệu trang chủ...
              </p>
            </div>
          </div>
        )}

        {/* MAIN SECTIONS */}
        {data && !showSkeleton && (
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
          <div className="mt-12 text-center text-gray-500">
            <p className="mb-2">
              Hiện tại không thể tải dữ liệu chi tiết, có thể backend đang tạm
              ngừng.
            </p>
            <p>
              Bạn vẫn có thể xem danh sách câu lạc bộ và sự kiện ở menu phía
              trên.
            </p>
          </div>
        )}

        <section className="mt-16 bg-[#ff6b35] rounded-2xl py-16 px-4 text-center text-white">
          <h2 className="text-3xl font-bold">Sẵn sàng để tham gia?</h2>
          <p className="mt-2 text-lg opacity-90">
            Trở thành một phần của cộng đồng sinh viên FPT năng động ngay hôm
            nay.
          </p>
          <a
            href="/clubs"
            className="inline-block mt-6 bg-white text-[#ff6b35] px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-bold"
          >
            Xem Danh Sách Câu Lạc Bộ
          </a>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
