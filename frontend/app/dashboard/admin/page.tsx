"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import { useRouter } from "next/navigation";

interface ResultRow {
    id: string;
    status: string;
    score: number | null;
    similarity_score: number | null;
    is_flagged: boolean;
    language: string;
    submitted_at: string;
    processed_at: string | null;
    student_username: string;
    student_full_name: string;
    assignment_title: string;
}

interface FlaggedPair {
    submission_id_1: string;
    submission_id_2: string;
    student_id_1: string;
    student_id_2: string;
    assignment_id: string;
    distance_meters: number;
}

interface WeeklyMetric {
    week: string;
    avg_score: number | null;
    submission_count: number;
}

interface CourseNode {
    id: string;
    label: string;
    path: string;
    description: string;
    depth: number;
    parent_path: string;
}

interface SimilarSubmission {
    submission_id: string;
    student_id: string;
    similarity: number;
}

type Tab = "results" | "flagged" | "metrics" | "courses" | "similarity";

/* ─── Loading Skeleton Components ─── */
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="animate-pulse">
            <div className="flex gap-4 p-4 border-b border-slate-800/40">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-3 bg-slate-800 rounded flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 p-4 border-b border-slate-800/20">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="h-4 bg-slate-800/60 rounded flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function CardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3 animate-pulse">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-slate-800/30 border border-slate-800/20 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/60" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-800/60 rounded w-2/3" />
                        <div className="h-3 bg-slate-800/40 rounded w-1/3" />
                    </div>
                    <div className="w-16 h-8 bg-slate-800/40 rounded-lg" />
                </div>
            ))}
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="flex items-end gap-3 h-48 px-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="h-3 bg-slate-800/40 rounded w-6" />
                        <div
                            className="w-full rounded-t-lg bg-slate-800/40"
                            style={{ height: `${20 + Math.random() * 80}%` }}
                        />
                        <div className="h-2 bg-slate-800/30 rounded w-8" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AdminPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("results");
    const [results, setResults] = useState<ResultRow[]>([]);
    const [flagged, setFlagged] = useState<FlaggedPair[]>([]);
    const [metrics, setMetrics] = useState<WeeklyMetric[]>([]);
    const [courses, setCourses] = useState<CourseNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // pgvector similarity state
    const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
    const [similarResults, setSimilarResults] = useState<SimilarSubmission[]>([]);
    const [similarLoading, setSimilarLoading] = useState(false);
    const [similarError, setSimilarError] = useState("");

    // Admin/teacher check
    useEffect(() => {
        if (user && user.role !== "teacher" && user.role !== "admin") {
            router.push("/dashboard");
        }
    }, [user, router]);

    useEffect(() => {
        loadTabData(activeTab);
    }, [activeTab]);

    const loadTabData = async (tab: Tab) => {
        if (tab === "similarity") {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            switch (tab) {
                case "results": {
                    const res = await api.get("/admin/results");
                    setResults(res.data.results);
                    break;
                }
                case "flagged": {
                    const res = await api.get("/admin/flagged?radius_meters=50");
                    setFlagged(res.data);
                    break;
                }
                case "metrics": {
                    const res = await api.get("/admin/metrics/weekly");
                    setMetrics(res.data);
                    break;
                }
                case "courses": {
                    const res = await api.get("/admin/courses/tree");
                    setCourses(res.data.courses);
                    break;
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Veri yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const searchSimilarity = async () => {
        if (!selectedSubmissionId.trim()) {
            setSimilarError("Lütfen bir Submission ID girin.");
            return;
        }
        setSimilarLoading(true);
        setSimilarError("");
        setSimilarResults([]);
        try {
            const res = await api.get(`/admin/similarity/${selectedSubmissionId.trim()}?top_k=10`);
            setSimilarResults(res.data);
        } catch (err: any) {
            setSimilarError(err.response?.data?.detail || "Benzerlik raporu yüklenirken hata oluştu.");
        } finally {
            setSimilarLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: "results", label: "Tüm Sonuçlar", icon: "📊" },
        { key: "flagged", label: "PostGIS Uyarılar", icon: "📍" },
        { key: "metrics", label: "TimescaleDB Grafik", icon: "📈" },
        { key: "courses", label: "ltree Ders Ağacı", icon: "🌳" },
        { key: "similarity", label: "pgvector Benzerlik", icon: "🔍" },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    Admin Paneli
                </h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-base">
                    Tüm öğrenci sonuçlarını, PostGIS konum uyarılarını ve sistem metriklerini görüntüle.
                </p>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 border border-slate-800/60 rounded-2xl p-1.5 sm:p-2 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                            activeTab === tab.key
                                ? "bg-blue-500/20 text-blue-400 shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.split(" ").pop()}</span>
                    </button>
                ))}
            </div>

            {/* Loading with skeletons */}
            {loading ? (
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 overflow-hidden">
                    {activeTab === "results" && <TableSkeleton rows={6} cols={5} />}
                    {activeTab === "flagged" && <CardSkeleton count={4} />}
                    {activeTab === "metrics" && <ChartSkeleton />}
                    {activeTab === "courses" && <CardSkeleton count={6} />}
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-2xl text-sm">{error}</div>
            ) : (
                <>
                    {/* Results tab */}
                    {activeTab === "results" && (
                        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-slate-800/60 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">Tüm Gönderimler</h2>
                                <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">{results.length} sonuç</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-800/60 bg-slate-950/40">
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Öğrenci</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Ödev</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Dil</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Skor</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Benzerlik</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Durum</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40">
                                        {results.map((r) => (
                                            <tr key={r.id} className={`hover:bg-slate-800/20 transition ${r.is_flagged ? "bg-red-500/5" : ""}`}>
                                                <td className="py-3 px-4">
                                                    <p className="text-white font-medium">{r.student_full_name}</p>
                                                    <p className="text-slate-500 text-xs">@{r.student_username}</p>
                                                </td>
                                                <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate">{r.assignment_title}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-mono uppercase">{r.language}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`font-bold ${
                                                        r.score === null ? "text-slate-500" : r.score >= 80 ? "text-emerald-400" : r.score >= 60 ? "text-yellow-400" : "text-red-400"
                                                    }`}>
                                                        {r.score ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`${
                                                        r.similarity_score === null ? "text-slate-500" :
                                                        r.similarity_score >= 0.9 ? "text-red-400 font-bold" :
                                                        r.similarity_score >= 0.7 ? "text-yellow-400" : "text-emerald-400"
                                                    }`}>
                                                        {r.similarity_score !== null ? `${(r.similarity_score * 100).toFixed(1)}%` : "—"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {r.is_flagged ? (
                                                        <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-400">⚠️ Şüpheli</span>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                                            r.status === "done" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                                                            r.status === "pending" ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400" :
                                                            "bg-slate-800 border border-slate-700 text-slate-400"
                                                        }`}>{r.status}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-500 text-xs">{formatDate(r.submitted_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PostGIS flagged tab */}
                    {activeTab === "flagged" && (
                        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-4 sm:p-6">
                            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 flex-wrap">
                                📍 PostGIS Konum Tabanlı Uyarılar
                                <span className="text-xs text-slate-500 font-normal bg-slate-800/60 px-2 py-0.5 rounded-lg">ST_DWithin (50m)</span>
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">Aynı ödev için 50 metre içinde gönderim yapan farklı öğrenci çiftleri.</p>

                            {flagged.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4">
                                        <span className="text-3xl">✅</span>
                                    </div>
                                    <p className="text-emerald-400 text-sm font-medium">Şüpheli konum tespiti bulunamadı.</p>
                                    <p className="text-slate-600 text-xs mt-1">Tüm gönderimler farklı konumlardan yapılmış.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {flagged.map((f, i) => (
                                        <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-lg flex-shrink-0">🚨</div>
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">
                                                        Öğrenci #{f.student_id_1.slice(0, 6)} ↔ #{f.student_id_2.slice(0, 6)}
                                                    </p>
                                                    <p className="text-slate-500 text-xs mt-0.5">Ödev: {f.assignment_id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-red-400 font-bold text-lg">{f.distance_meters.toFixed(1)}m</p>
                                                <p className="text-slate-500 text-xs">mesafe</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TimescaleDB metrics tab */}
                    {activeTab === "metrics" && (
                        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-4 sm:p-6">
                            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 flex-wrap">
                                📈 Haftalık Performans Metrikleri
                                <span className="text-xs text-slate-500 font-normal bg-slate-800/60 px-2 py-0.5 rounded-lg">TimescaleDB time_bucket</span>
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">Haftalık ortalama skor ve gönderim sayısı.</p>

                            {metrics.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/60 mb-4">
                                        <span className="text-3xl">📊</span>
                                    </div>
                                    <p className="text-slate-500 text-sm">Henüz yeterli metrik verisi yok.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Bar chart */}
                                    <div className="flex items-end gap-2 sm:gap-3 h-48 px-2 sm:px-4">
                                        {metrics.slice().reverse().map((m, i) => {
                                            const maxCount = Math.max(...metrics.map(x => x.submission_count), 1);
                                            const height = (m.submission_count / maxCount) * 100;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                                    <span className="text-xs text-slate-400 font-medium opacity-0 group-hover:opacity-100 transition">{m.submission_count}</span>
                                                    <div
                                                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 min-h-[4px] group-hover:from-blue-500 group-hover:to-blue-300"
                                                        style={{ height: `${height}%` }}
                                                    />
                                                    <span className="text-[10px] text-slate-500">{new Date(m.week).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Average score indicator */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {metrics.slice(0, 3).map((m, i) => (
                                            <div key={i} className="bg-slate-800/30 rounded-xl p-4 border border-slate-800/20">
                                                <p className="text-xs text-slate-500 mb-1">
                                                    {new Date(m.week).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                                </p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-2xl font-bold ${
                                                        m.avg_score === null ? "text-slate-500" : m.avg_score >= 80 ? "text-emerald-400" : m.avg_score >= 60 ? "text-yellow-400" : "text-red-400"
                                                    }`}>
                                                        {m.avg_score !== null ? m.avg_score.toFixed(0) : "—"}
                                                    </span>
                                                    <span className="text-xs text-slate-500">ort. skor</span>
                                                </div>
                                                <p className="text-xs text-blue-400 mt-1">{m.submission_count} gönderim</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-800/60">
                                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Hafta</th>
                                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Ort. Skor</th>
                                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Gönderim Sayısı</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/40">
                                                {metrics.map((m, i) => (
                                                    <tr key={i} className="hover:bg-slate-800/20 transition">
                                                        <td className="py-3 px-4 text-slate-300">{new Date(m.week).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`font-bold ${
                                                                m.avg_score === null ? "text-slate-500" : m.avg_score >= 80 ? "text-emerald-400" : m.avg_score >= 60 ? "text-yellow-400" : "text-red-400"
                                                            }`}>
                                                                {m.avg_score !== null ? m.avg_score.toFixed(1) : "—"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-blue-400 font-medium">{m.submission_count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ltree courses tab */}
                    {activeTab === "courses" && (
                        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-4 sm:p-6">
                            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 flex-wrap">
                                🌳 Ders Ağacı Hiyerarşisi
                                <span className="text-xs text-slate-500 font-normal bg-slate-800/60 px-2 py-0.5 rounded-lg">ltree nlevel() + subpath()</span>
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">PostgreSQL ltree extension ile hiyerarşik ders yapısı.</p>

                            {courses.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/60 mb-4">
                                        <span className="text-3xl">🌳</span>
                                    </div>
                                    <p className="text-slate-500 text-sm">Henüz ders ağacı tanımlanmamış.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {courses.map((node) => (
                                        <div
                                            key={node.id}
                                            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-slate-800/40 bg-slate-800/10 hover:bg-slate-800/30 transition"
                                            style={{ marginLeft: `${(node.depth - 1) * 20}px` }}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                                                node.depth === 1 ? "bg-blue-500/20 text-blue-400" :
                                                node.depth === 2 ? "bg-emerald-500/20 text-emerald-400" :
                                                node.depth === 3 ? "bg-indigo-500/20 text-indigo-400" :
                                                "bg-slate-800 text-slate-400"
                                            }`}>
                                                {node.depth === 1 ? "🏫" : node.depth === 2 ? "📚" : node.depth === 3 ? "📖" : "📄"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium text-sm truncate">{node.label}</p>
                                                <p className="text-slate-500 text-xs truncate">{node.description || node.path}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-600 font-mono bg-slate-800/60 px-2 py-0.5 rounded hidden sm:inline">{node.path}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* pgvector similarity tab */}
                    {activeTab === "similarity" && (
                        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-4 sm:p-6">
                            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 flex-wrap">
                                🔍 Kod Benzerlik Raporu
                                <span className="text-xs text-slate-500 font-normal bg-slate-800/60 px-2 py-0.5 rounded-lg">pgvector cosine distance</span>
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">
                                Bir gönderimin kodunu pgvector embedding vektörleri ile diğer gönderimlerle karşılaştır.
                            </p>

                            {/* Search input */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedSubmissionId}
                                        onChange={(e) => setSelectedSubmissionId(e.target.value)}
                                        placeholder="Submission ID girin (örn: a1b2c3d4-...)"
                                        className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-950/60 border border-slate-800/50 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition font-mono"
                                        onKeyDown={(e) => e.key === "Enter" && searchSimilarity()}
                                    />
                                </div>
                                <button
                                    onClick={searchSimilarity}
                                    disabled={similarLoading}
                                    className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-lg shadow-indigo-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center whitespace-nowrap"
                                >
                                    {similarLoading ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Aranıyor...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                            </svg>
                                            Benzerlik Ara
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Quick pick from results */}
                            {results.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs text-slate-500 mb-2">Hızlı seçim (son gönderimlerden):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {results.slice(0, 5).map((r) => (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    setSelectedSubmissionId(r.id);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                                                    selectedSubmissionId === r.id
                                                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                                        : "bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:text-slate-300"
                                                }`}
                                            >
                                                #{r.id.slice(0, 8)} — {r.student_full_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {similarError && (
                                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    {similarError}
                                </div>
                            )}

                            {/* Results */}
                            {similarLoading ? (
                                <CardSkeleton count={5} />
                            ) : similarResults.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-white">En Benzer Gönderimler</h3>
                                        <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">{similarResults.length} sonuç</span>
                                    </div>
                                    {similarResults.map((s, i) => {
                                        const simPercent = (s.similarity * 100);
                                        const isHigh = simPercent >= 90;
                                        const isMedium = simPercent >= 70;
                                        return (
                                            <div
                                                key={i}
                                                className={`rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 border transition-all duration-200 hover:scale-[1.01] ${
                                                    isHigh
                                                        ? "bg-red-500/5 border-red-500/20"
                                                        : isMedium
                                                            ? "bg-yellow-500/5 border-yellow-500/20"
                                                            : "bg-slate-800/10 border-slate-800/40"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                                                        isHigh ? "bg-red-500/10 text-red-400" :
                                                        isMedium ? "bg-yellow-500/10 text-yellow-400" :
                                                        "bg-slate-800/60 text-slate-400"
                                                    }`}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white text-sm font-medium truncate">
                                                            Submission #{s.submission_id.slice(0, 8)}
                                                        </p>
                                                        <p className="text-slate-500 text-xs mt-0.5 font-mono">
                                                            Öğrenci: {s.student_id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`text-lg font-bold ${
                                                        isHigh ? "text-red-400" : isMedium ? "text-yellow-400" : "text-emerald-400"
                                                    }`}>
                                                        {simPercent.toFixed(1)}%
                                                    </p>
                                                    <p className="text-slate-500 text-xs">benzerlik</p>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="hidden sm:block w-32 flex-shrink-0">
                                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ${
                                                                isHigh ? "bg-gradient-to-r from-red-600 to-red-400" :
                                                                isMedium ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                                                                "bg-gradient-to-r from-emerald-600 to-emerald-400"
                                                            }`}
                                                            style={{ width: `${simPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : !similarLoading && selectedSubmissionId && !similarError ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/60 mb-4">
                                        <span className="text-3xl">🔍</span>
                                    </div>
                                    <p className="text-slate-500 text-sm">Sonuç bulunamadı veya henüz arama yapılmadı.</p>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 mb-4">
                                        <span className="text-3xl">🧬</span>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">Bir Submission ID girin</p>
                                    <p className="text-slate-600 text-xs mt-1">pgvector cosine similarity ile en benzer kodları bulun.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
