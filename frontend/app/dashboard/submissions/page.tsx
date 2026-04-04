"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import Link from "next/link";

interface Submission {
    id: string;
    assignment_id: string;
    code_text: string;
    language: string;
    status: string;
    score: number | null;
    feedback: string | null;
    similarity_score: number | null;
    is_flagged: boolean;
    test_results: Record<string, string> | null;
    submitted_at: string;
    processed_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "Bekliyor", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    processing: { label: "İşleniyor", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    done: { label: "Tamamlandı", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    error: { label: "Hata", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function SubmissionsPage() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const res = await api.get("/submissions/my");
            setSubmissions(res.data.submissions);
        } catch (err: any) {
            setError("Gönderimler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return "text-slate-500";
        if (score >= 80) return "text-emerald-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">
                    Gönderimlerim
                </h1>
                <p className="text-slate-400 mt-1">
                    Tüm kod gönderimlerini ve sonuçlarını burada görebilirsin.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition" />
                    <p className="text-slate-400 text-xs font-medium">Toplam</p>
                    <p className="text-3xl font-extrabold text-blue-400 mt-1">{loading ? "—" : submissions.length}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition" />
                    <p className="text-slate-400 text-xs font-medium">Tamamlanan</p>
                    <p className="text-3xl font-extrabold text-emerald-400 mt-1">{loading ? "—" : submissions.filter(s => s.status === "done").length}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-yellow-500/20 transition" />
                    <p className="text-slate-400 text-xs font-medium">Bekleyen</p>
                    <p className="text-3xl font-extrabold text-yellow-400 mt-1">{loading ? "—" : submissions.filter(s => s.status === "pending" || s.status === "processing").length}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition" />
                    <p className="text-slate-400 text-xs font-medium">Ort. Skor</p>
                    <p className="text-3xl font-extrabold text-indigo-400 mt-1">
                        {loading ? "—" : (() => {
                            const scored = submissions.filter(s => s.score !== null);
                            if (scored.length === 0) return "—";
                            return Math.round(scored.reduce((sum, s) => sum + (s.score || 0), 0) / scored.length);
                        })()}
                    </p>
                </div>
            </div>

            {/* Submissions list */}
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800/60">
                    <h2 className="text-lg font-semibold text-white">Gönderim Geçmişi</h2>
                </div>

                {loading ? (
                    <div className="animate-pulse divide-y divide-slate-800/20">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-5">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800/60" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-slate-800/60 rounded w-1/3" />
                                        <div className="h-3 bg-slate-800/40 rounded w-1/4" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-6 bg-slate-800/40 rounded" />
                                    <div className="w-20 h-7 bg-slate-800/40 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/60 mb-4">
                            <svg className="w-8 h-8 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="text-slate-500 text-sm">Henüz gönderim yok.</p>
                        <p className="text-slate-600 text-xs mt-1">Bir ödeve git ve kodunu gönder!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/40">
                        {submissions.map((sub) => {
                            const status = statusConfig[sub.status] || statusConfig.pending;
                            return (
                                <Link
                                    key={sub.id}
                                    href={`/dashboard/submissions/${sub.id}`}
                                    className="flex items-center justify-between p-5 hover:bg-slate-800/30 transition-all duration-200 group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Language icon */}
                                        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{sub.language.slice(0, 3)}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-medium text-white group-hover:text-blue-400 transition truncate">
                                                    Gönderim #{sub.id.slice(0, 8)}
                                                </p>
                                                {sub.is_flagged && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-400">
                                                        ⚠️ Şüpheli
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">{formatDate(sub.submitted_at)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 ml-4">
                                        {/* Score */}
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Skor</p>
                                            <p className={`text-lg font-bold ${getScoreColor(sub.score)}`}>
                                                {sub.score !== null ? sub.score : "—"}
                                            </p>
                                        </div>

                                        {/* Status badge */}
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${status.bg} ${status.border} ${status.color} min-w-[90px] text-center`}>
                                            {status.label}
                                        </span>

                                        {/* Arrow */}
                                        <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
