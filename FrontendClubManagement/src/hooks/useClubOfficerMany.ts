// import { useEffect, useMemo, useState } from "react";
// import { axiosClient } from "@/api/axiosClient";
// import { isCanceled } from "@/utils/isCanceled";

// type ApiResp<T> = { data?: T; result?: T } | T;
// type TeamMyRoleResp = { myRoles?: string[]; member?: boolean };

// const TTL_MS = 5 * 60 * 1000;

// const norm = (s: string) =>
//   (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// const isOfficerByNames = (roles: string[] = []) => {
//   const r = roles.map(norm);
//   return (
//     r.some((x) => x.includes("chu nhiem")) ||
//     r.some((x) => x.includes("phó chủ nhiệm") || x.includes("pho chu nhiem")) ||
//     r.some((x) => x.includes("president")) ||
//     r.some((x) => x.includes("vice"))
//   );
// };

// function unwrap<T>(raw: unknown): T {
//   if (raw && typeof raw === "object") {
//     const anyRaw = raw as Record<string, unknown>;
//     if ("data" in anyRaw && anyRaw.data != null) return anyRaw.data as T;
//     if ("result" in anyRaw && anyRaw.result != null) return anyRaw.result as T;
//   }
//   return raw as T;
// }

// function readCacheBool(key: string): boolean | null {
//   try {
//     const s = sessionStorage.getItem(key);
//     if (!s) return null;
//     const { value, at } = JSON.parse(s);
//     if (Date.now() - at > TTL_MS) return null;
//     return typeof value === "boolean" ? value : null;
//   } catch {
//     return null;
//   }
// }
// function writeCacheBool(key: string, value: boolean) {
//   try {
//     sessionStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
//   } catch {}
// }

// async function checkClubLevel(clubId: number, signal?: AbortSignal) {
//   try {
//     const res = await axiosClient.get<{ myRoles?: string[] }>(
//       `/clubs/${clubId}/my-role`,
//       { signal, timeout: 5000 }
//     );
//     const payload = unwrap<{ myRoles?: string[] }>(res as any);
//     return isOfficerByNames(payload?.myRoles ?? []);
//   } catch (e) {
//     if (isCanceled(e)) return false;
//     return false;
//   }
// }

// const inflight = new Map<string, Promise<boolean>>();
// const keyOf = (clubId: number, teamIds: number[]) => `${clubId}|${teamIds.join(",")}`;

// async function checkOfficerMany(
//   clubId: number,
//   teamIds: number[],
//   signal?: AbortSignal
// ): Promise<boolean> {
//   if (teamIds.length === 0) {
//     return checkClubLevel(clubId, signal);
//   }

//   const perReqTimeoutMs = 5000;
//   const CONCURRENCY = Math.min(4, teamIds.length);
//   let resolved = false;

//   const queue = [...teamIds];
//   const controllers: AbortController[] = [];
//   const stopAll = () => controllers.forEach((c) => c.abort());

//   const runOne = async (): Promise<void> => {
//     if (resolved) return;
//     const teamId = queue.shift();
//     if (teamId == null) return;
//     const controller = new AbortController();
//     controllers.push(controller);

//     try {
//       const req = axiosClient.get<ApiResp<TeamMyRoleResp>>(
//         `/clubs/${clubId}/teams/${teamId}/my-role`,
//         { signal: controller.signal, timeout: perReqTimeoutMs }
//       );
//       const softTimeout = new Promise<never>((_, rej) => {
//         const t = setTimeout(() => {
//           controller.abort();
//           rej(new Error("SoftTimeout"));
//         }, perReqTimeoutMs);
//         (req as any).finally?.(() => clearTimeout(t));
//       });

//       const res = await Promise.race([req as any, softTimeout]);
//       const payload = unwrap<TeamMyRoleResp>(res as any);
//       const ok = isOfficerByNames(payload?.myRoles ?? []);

//       if (!resolved && ok) {
//         resolved = true;
//         stopAll();
//         return;
//       }
//     } catch (e) {
//       if (!isCanceled(e)) {
//       }
//     }
//     if (!resolved) {
//       await runOne();
//     }
//   };

//   await Promise.race(
//     Array.from({ length: CONCURRENCY }, () => runOne()).concat([
//       (async () => {
//         // đợi rỗng hàng đợi
//         while (queue.length > 0 && !resolved) {
//           await new Promise((r) => setTimeout(r, 50));
//         }
//       })(),
//     ])
//   );

//   return resolved;
// }

// export function useClubOfficerMany(clubId?: number, teamIds?: number[]) {
//   const [isOfficer, setIsOfficer] = useState<boolean>(false);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setErr] = useState<string | null>(null);

//   const sortedTeamIds = useMemo(
//     () => (teamIds ?? []).filter(Number.isFinite).map(Number).sort((a, b) => a - b),
//     [teamIds]
//   );

//   const cacheKey = clubId ? `officer:${clubId}` : "";
//   const key = useMemo(
//     () =>
//       Number.isFinite(clubId as number) ? keyOf(clubId as number, sortedTeamIds) : "",
//     [clubId, sortedTeamIds]
//   );

//   useEffect(() => {
//     if (!clubId) return;
//     const cached = readCacheBool(cacheKey);
//     if (cached != null) setIsOfficer(cached);
//   }, [clubId, cacheKey]);

//   useEffect(() => {
//     if (!clubId) {
//       setLoading(false);
//       return;
//     }
//     let cancelled = false;
//     const controller = new AbortController();

//     (async () => {
//       setErr(null);
//       setLoading(true);

//       try {
//         const existed = inflight.get(key);
//         const p =
//           existed ??
//           checkOfficerMany(clubId, sortedTeamIds, controller.signal).finally(() => {
//             inflight.delete(key);
//           });
//         if (!existed) inflight.set(key, p);
//         const ok = await p;

//         if (!cancelled) {
//           setIsOfficer(ok);
//           writeCacheBool(cacheKey, ok);
//         }
//       } catch (e: any) {
//         if (!cancelled && !isCanceled(e)) {
//           setErr(e?.message || "Không kiểm tra được quyền.");
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();

//     return () => {
//       cancelled = true;
//       controller.abort();
//     };
//   }, [clubId, key, cacheKey, sortedTeamIds]);

//   return { isOfficer, loading, error };
// }
