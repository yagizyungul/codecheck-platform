"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import { useRouter } from "next/navigation";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from "recharts";

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
            <div className="flex gap-4 p-4 border-b border-slate-100">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-3 bg-slate-200 rounded flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 p-4 border-b border-slate-50">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="h-4 bg-slate-100 rounded flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
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
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                    <div className="w-16 h-8 bg-slate-100 rounded-lg" />
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
                        <div className="h-3 bg-slate-100 rounded w-6" />
                        <div
                            className="w-full rounded-t-lg bg-slate-100"
                            style={{ height: `${20 + Math.random() * 80}%` }}
                        />
                        <div className="h-2 bg-slate-200 rounded w-8" />
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
                    const res = await api.get("/admin/metrics/daily");
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

    const tabs: { key: Tab; label: string }[] = [
        { key: "results", label: "Tüm Sonuçlar" },
        { key: "flagged", label: "Konum Uyarıları" },
        { key: "metrics", label: "Sistem Metrikleri" },
        { key: "courses", label: "Ders Yapısı" },
        { key: "similarity", label: "Benzerlik Analizi" },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Admin Paneli
                </h1>
                <p className="text-slate-500 mt-1 text-sm sm:text-base">
                    Sistem genelindeki tüm öğrenci sonuçlarını ve metrikleri buradan yönetebilirsiniz.
                </p>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 sm:p-1.5 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                            activeTab === tab.key
                                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Loading with skeletons */}
            {loading ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-hidden shadow-sm">
                    {activeTab === "results" && <TableSkeleton rows={6} cols={5} />}
                    {activeTab === "flagged" && <CardSkeleton count={4} />}
                    {activeTab === "metrics" && <ChartSkeleton />}
                    {activeTab === "courses" && <CardSkeleton count={6} />}
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-medium">{error}</div>
            ) : (
                <>
                    {/* Results tab */}
                    {activeTab === "results" && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">Tüm Gönderimler</h2>
                                <span className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full font-medium">{results.length} sonuç</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Öğrenci</th>
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Ödev</th>
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Dil</th>
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Skor</th>
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Benzerlik</th>
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Durum</th>
                                            <th className="text-left py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {results.map((r) => (
                                            <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.is_flagged ? "bg-red-50/30" : ""}`}>
                                                <td className="py-4 px-4">
                                                    <p className="text-slate-900 font-semibold">{r.student_full_name}</p>
                                                    <p className="text-slate-500 text-xs">@{r.student_username}</p>
                                                </td>
                                                <td className="py-4 px-4 text-slate-600 max-w-[200px] truncate font-medium">{r.assignment_title}</td>
                                                <td className="py-4 px-4">
                                                    <span className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500 text-[10px] font-bold font-mono uppercase">{r.language}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`font-bold text-base ${
                                                        r.score === null ? "text-slate-300" : r.score >= 80 ? "text-emerald-600" : r.score >= 60 ? "text-yellow-600" : "text-red-600"
                                                    }`}>
                                                        {r.score ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`font-semibold ${
                                                        r.similarity_score === null ? "text-slate-300" :
                                                        r.similarity_score >= 0.9 ? "text-red-600" :
                                                        r.similarity_score >= 0.7 ? "text-yellow-600" : "text-emerald-600"
                                                    }`}>
                                                        {r.similarity_score !== null ? `%${(r.similarity_score * 100).toFixed(1)}` : "—"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    {r.is_flagged ? (
                                                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">Şüpheli</span>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                                                            r.status === "done" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                                            r.status === "pending" ? "bg-yellow-50 border-yellow-100 text-yellow-600" :
                                                            "bg-slate-50 border-slate-200 text-slate-500"
                                                        }`}>{r.status.toUpperCase()}</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-slate-400 text-xs font-medium">{formatDate(r.submitted_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PostGIS flagged tab */}
                    {activeTab === "flagged" && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 flex-wrap">
                                Konum Tabanlı Güvenlik Uyarıları
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">ST_DWithin 50m</span>
                            </h2>
                            <p className="text-slate-500 text-sm mb-6 font-medium">Aynı ödev için çok yakın mesafe içerisinde gönderim yapmış öğrenci çiftleri.</p>

                            {flagged.length === 0 ? (
                                <div className="text-center py-16">
                                    <p className="text-slate-400 text-sm font-semibold">Herhangi bir şüpheli konum tespiti bulunmuyor.</p>
                                    <p className="text-slate-300 text-xs mt-1">Tüm gönderim güvenliği kuralları sağlanmış durumda.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {flagged.map((f, i) => (
                                        <div key={i} className="bg-red-50/30 border border-red-100 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className="min-w-0">
                                                    <p className="text-slate-900 text-sm font-bold truncate">
                                                        Öğrenci Analizi: #{f.student_id_1.slice(0, 6)} ↔ #{f.student_id_2.slice(0, 6)}
                                                    </p>
                                                    <p className="text-slate-500 text-xs mt-0.5 font-medium">İlgili Ödev: {f.assignment_id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-red-600 font-extrabold text-xl">{f.distance_meters.toFixed(1)}m</p>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mesafe</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TimescaleDB metrics tab */}
                    {activeTab === "metrics" && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-10 shadow-sm">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 flex-wrap">
                                    Sistem Performans Analizi
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Veri Periyodu: Son 30 Gün</span>
                                </h2>
                                <p className="text-slate-500 text-sm font-medium">Günlük bazda başarı ortalamaları ve sistem kullanım yoğunluğu.</p>
                            </div>

                            {metrics.length === 0 ? (
                                <div className="text-center py-24">
                                    <p className="text-slate-400 text-sm font-semibold">Henüz yeterli metrik verisi toplanmadı.</p>
                                    <p className="text-slate-300 text-xs mt-1">Zaman içerisinde veri biriktikçe grafikler güncellenecektir.</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {/* Skor Gelişimi (Area Chart) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Başarı Skoru Gelişimi (%)</h3>
                                        </div>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={metrics}>
                                                    <defs>
                                                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                    <XAxis 
                                                        dataKey="week" 
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 500}}
                                                        tickFormatter={(str) => new Date(str).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                                        minTickGap={40}
                                                    />
                                                    <YAxis 
                                                        domain={[0, 100]}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 500}}
                                                        tickFormatter={(val) => `%${val}`}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#0f172a', fontSize: '11px', fontWeight: 600}}
                                                        itemStyle={{color: '#2563eb'}}
                                                        labelFormatter={(label) => new Date(label).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                                                        formatter={(value: any) => [`%${parseFloat(value).toFixed(1)}`, 'Ort. Skor']}
                                                    />
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="avg_score" 
                                                        stroke="#2563eb" 
                                                        strokeWidth={2}
                                                        fillOpacity={1} 
                                                        fill="url(#scoreColor)" 
                                                        animationDuration={1000}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Gönderim Yoğunluğu (Bar Chart) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Günlük Gönderim Yoğunluğu</h3>
                                        </div>
                                        <div className="h-40 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={metrics}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                    <XAxis 
                                                        dataKey="week" 
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 500}}
                                                        tickFormatter={(str) => new Date(str).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                                        minTickGap={40}
                                                    />
                                                    <YAxis 
                                                        axisLine={false} 
                                                        tickLine={false} 
                                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 500}} 
                                                    />
                                                    <Tooltip 
                                                        cursor={{fill: '#f8fafc'}}
                                                        contentStyle={{backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#0f172a', fontSize: '11px', fontWeight: 600}}
                                                        labelFormatter={(label) => new Date(label).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                                                    />
                                                    <Bar 
                                                        dataKey="submission_count" 
                                                        fill="#475569" 
                                                        radius={[2, 2, 0, 0]}
                                                        barSize={16}
                                                        animationDuration={1000}
                                                    >
                                                        {metrics.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === metrics.length - 1 ? '#2563eb' : '#cbd5e1'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Özet Kartları */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Toplam Gönderim</span>
                                            <span className="text-3xl font-extrabold text-slate-900 mt-2 leading-none">{metrics.reduce((acc, curr) => acc + curr.submission_count, 0)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Genel Başarı Ort.</span>
                                            <span className="text-3xl font-extrabold text-blue-600 mt-2 leading-none">
                                                %{((metrics.reduce((acc, curr) => acc + (curr.avg_score || 0), 0)) / metrics.length).toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aktif Dönem</span>
                                            <span className="text-sm font-bold text-slate-600 mt-2">
                                                {new Date(metrics[0].week).toLocaleDateString("tr-TR", { month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ltree courses tab */}
                    {activeTab === "courses" && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 flex-wrap">
                                Ders Hiyerarşisi (ltree)
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Kategorik Yapı</span>
                            </h2>
                            <p className="text-slate-500 text-sm mb-6 font-medium">Sistemde tanımlı derslerin ağaç yapısı ve dosya yolu hiyerarşisi.</p>

                            {courses.length === 0 ? (
                                <div className="text-center py-20">
                                    <p className="text-slate-400 text-sm font-semibold">Henüz tanımlı bir ders hiyerarşisi bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {courses.map((node) => (
                                        <div
                                            key={node.id}
                                            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                                            style={{ marginLeft: `${(node.depth - 1) * 24}px` }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 font-bold text-sm truncate">{node.label}</p>
                                                <p className="text-slate-500 text-xs font-medium truncate">{node.description || node.path}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded hidden sm:inline">{node.path}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* pgvector similarity tab */}
                    {activeTab === "similarity" && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 flex-wrap">
                                Benzerlik Analizi Denetimi
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">pgvector cosine</span>
                            </h2>
                            <p className="text-slate-500 text-sm mb-8 font-medium">
                                Bir kod gönderimini diğer tüm gönderimlerle vektörel olarak karşılaştırıp benzerlik oranlarını analiz edin.
                            </p>

                            {/* Search input */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={selectedSubmissionId}
                                        onChange={(e) => setSelectedSubmissionId(e.target.value)}
                                        placeholder="Gönderim ID girin (Örn: a1b2c3...)"
                                        className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition font-mono font-bold"
                                        onKeyDown={(e) => e.key === "Enter" && searchSimilarity()}
                                    />
                                </div>
                                <button
                                    onClick={searchSimilarity}
                                    disabled={similarLoading}
                                    className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center whitespace-nowrap"
                                >
                                    {similarLoading ? "Analiz Ediliyor..." : "Benzerlik Ara"}
                                </button>
                            </div>

                            {/* Quick pick */}
                            {results.length > 0 && (
                                <div className="mb-8">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Hızlı Seçim Listesi</p>
                                    <div className="flex flex-wrap gap-2">
                                        {results.slice(0, 5).map((r) => (
                                            <button
                                                key={r.id}
                                                onClick={() => setSelectedSubmissionId(r.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all duration-200 ${
                                                    selectedSubmissionId === r.id
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
                                                }`}
                                            >
                                                #{r.id.slice(0, 6)} — {r.student_full_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {similarError && (
                                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                    {similarError}
                                </div>
                            )}

                            {/* Results */}
                            {similarLoading ? (
                                <CardSkeleton count={5} />
                            ) : similarResults.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Benzer Raporlanan Gönderimler</h3>
                                        <span className="text-[10px] text-slate-500 bg-slate-50 px-3 py-1 rounded-full font-bold">{similarResults.length} eşleşme</span>
                                    </div>
                                    {similarResults.map((s, i) => {
                                        const simPercent = (s.similarity * 100);
                                        const isHigh = simPercent >= 90;
                                        const isMedium = simPercent >= 70;
                                        return (
                                            <div
                                                key={i}
                                                className={`rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 border transition-all duration-200 ${
                                                    isHigh
                                                        ? "bg-red-50 border-red-100"
                                                        : isMedium
                                                            ? "bg-yellow-50 border-yellow-100"
                                                            : "bg-white border-slate-100"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${
                                                        isHigh ? "bg-red-100 text-red-600" :
                                                        isMedium ? "bg-yellow-100 text-yellow-600" :
                                                        "bg-slate-100 text-slate-500"
                                                    }`}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-slate-900 text-sm font-bold truncate">Gönderim: #{s.submission_id.slice(0, 8)}</p>
                                                        <p className="text-slate-500 text-[11px] mt-0.5 font-bold font-mono">Öğrenci: #{s.student_id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`text-xl font-black ${
                                                        isHigh ? "text-red-600" : isMedium ? "text-yellow-600" : "text-emerald-600"
                                                    }`}>%{simPercent.toFixed(1)}</p>
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Benzerlik Skoru</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : !similarLoading && selectedSubmissionId && !similarError ? (
                                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <p className="text-slate-400 text-sm font-semibold">Herhangi bir eşleşme bulunamadı.</p>
                                </div>
                            ) : (
                                <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                                    <p className="text-slate-500 text-sm font-bold mb-1">Analiz Başlatın</p>
                                    <p className="text-slate-400 text-xs font-medium">Lütfen yukarıdaki kutuya bir Gönderim ID girin.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
