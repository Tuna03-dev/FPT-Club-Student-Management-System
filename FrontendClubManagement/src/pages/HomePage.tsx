"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { publicBannerApi } from "@/api/publicBannerApi";

import { getAllNewsByFilter } from "../service/NewsService";
import { getAllEventsByFilter } from "../service/EventService";
import { getPublicClubs } from "../api/publicClubs";

import type { NewsFilterRequest } from "../service/NewsService";
import type { EventFilterRequest } from "../service/EventService";

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

/* HELPERS */
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

/* SEARCH API */
async function searchHomepageApi(keyword: string): Promise<SearchResultItem[]> {
  const q = keyword.trim().toLowerCase();
  if (!q) return [];

  const newsReq: NewsFilterRequest = { keyword: q, page: 1, size: 5 };
  const eventReq: EventFilterRequest = { keyword: q, page: 1, size: 5 };

  const [newsResp, eventResp, clubResp] = await Promise.all([
    getAllNewsByFilter(newsReq).catch(() => ({ data: [] })),
    getAllEventsByFilter(eventReq).catch(() => ({ data: [] })),
    getPublicClubs({ q, page: 0, size: 5 }).catch(() => ({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 0,
    })),
  ]);

  const results: SearchResultItem[] = [];

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

  for (const e of eventResp.data ?? []) {
    const subtitleParts: string[] = [];
    if (e.clubName) subtitleParts.push(e.clubName);
    if (e.eventTypeName) subtitleParts.push(e.eventTypeName);
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

  for (const c of clubResp.content ?? []) {
    const subtitleParts = [c.categoryName, c.campusName].filter(Boolean);
    const subtitle = subtitleParts.join(" • ");
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

/* ===================== MAIN COMPONENT ===================== */
const HomePage: React.FC = () => {
  const [data, setData] = useState<HomepageData | null>(null);
  const [banner, setBanner] = useState<any>(null);
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

  /* LOAD HOME + BANNER */
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const homepageData = await getHomepageData();
      setData(homepageData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    publicBannerApi.get().then((r) => setBanner(r.data)); // <<-- LOAD BANNER
  }, [fetchData]);

  const fallbackImage = "/default-banner.jpg"; // <<-- Ảnh fallback

  const showSkeleton = loading && !data;
  void activeIndex;
  /* SEARCH logic */
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setActiveIndex(-1);
      return;
    }
    try {
      setSearchLoading(true);
      const results = await searchHomepageApi(q);
      setSearchResults(results);
      setActiveIndex(results.length ? 0 : -1);
    } catch {
      setSearchError("Không thể tìm kiếm. Vui lòng thử lại.");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchTerm) return setSearchResults([]);
    const timeout = setTimeout(() => performSearch(searchTerm), 350);
    return () => clearTimeout(timeout);
  }, [searchTerm, performSearch]);

  const grouped = {
    news: searchResults.filter((r) => r.type === "news"),
    event: searchResults.filter((r) => r.type === "event"),
    club: searchResults.filter((r) => r.type === "club"),
  };

  const typeIconMap = {
    news: <Newspaper className="w-4 h-4" />,
    club: <Users className="w-4 h-4" />,
    event: <CalendarDays className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen">
      {/* ============ HERO BANNER ============ */}
      <section
        className="text-white py-20 md:py-32 bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${
            banner?.imageUrl || fallbackImage
          }')`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide">
            {banner?.title ?? "Đang tải..."}
          </h1>
          <h2 className="text-4xl md:text-6xl font-black uppercase text-[#ff6b35]">
            {banner?.subtitle ?? ""}
          </h2>

          {/* SEARCH BOX GIỮ NGUYÊN */}
          <div className="mt-8 max-w-2xl mx-auto relative">
            <div className="relative flex items-center mx-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && searchResults.length)
                    setActiveIndex((i) =>
                      i < searchResults.length - 1 ? i + 1 : 0
                    );
                }}
                placeholder="Tìm kiếm câu lạc bộ, sự kiện, tin tức..."
                className="w-full pl-5 pr-36 py-3 rounded-full bg-white text-gray-800 shadow-lg border border-white/40 focus:ring-2 focus:ring-[#ff6b35]"
              />

              <button
                type="button"
                onClick={() => searchTerm && performSearch(searchTerm)}
                className="absolute right-2 px-6 py-2 rounded-full bg-[#ff6b35] text-white shadow-md flex items-center gap-2 hover:bg-[#e55a2b]"
              >
                <Search className="w-5 h-5" />
                Tìm kiếm
              </button>
            </div>

            {/* SEARCH DROPDOWN GIỮ NGUYÊN */}
            {isFocused &&
              searchTerm.trim() &&
              (searchLoading || searchResults.length > 0 || searchError) && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl max-h-96 overflow-y-auto z-20 border border-slate-100 text-gray-800">
                  {searchLoading && (
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-[#ff6b35] animate-spin" />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  )}

                  {!searchLoading &&
                    Object.entries(grouped).map(([type, items]) =>
                      items.length ? (
                        <div
                          key={type}
                          className="border-t border-slate-100 first:border-t-0"
                        >
                          <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {typeIconMap[type as SearchResultType]}
                              <span>
                                {type === "news"
                                  ? "Tin tức"
                                  : type === "event"
                                    ? "Sự kiện"
                                    : "Câu lạc bộ"}
                              </span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {items.length}
                            </span>
                          </div>

                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => navigate(item.url)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between"
                            >
                              <div>
                                <div className="text-sm font-medium">
                                  {highlightMatch(item.title, searchTerm)}
                                </div>
                                {item.subtitle && (
                                  <div className="text-xs text-gray-500">
                                    {highlightMatch(item.subtitle, searchTerm)}
                                  </div>
                                )}
                              </div>
                              <ArrowUpRight className="w-4 h-4 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      ) : null
                    )}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
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
      </div>
    </div>
  );
};

export default HomePage;
