"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import api from "../../../lib/api";

interface Submission {
    id: string;
    assignment_id: string;
    student_id: string;
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

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    pending: { label: "Kuyrukta Bekliyor", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: "⏳" },
    processing: { label: "AI Analiz Ediyor", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "🤖" },
    done: { label: "Tamamlandı", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "✅" },
    error: { label: "Hata Oluştu", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: "❌" },
};

export default function SubmissionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const submissionId = params.id as string;

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchSubmission();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [submissionId]);

    const fetchSubmission = async () => {
        try {
            const res = await api.get(`/submissions/${submissionId}`);
            setSubmission(res.data);

            // Status "done" veya "error" değilse polling başlat
            if (res.data.status !== "done" && res.data.status !== "error") {
                startPolling();
            }
        } catch (err: any) {
            setError("Gönderim bulunamadı.");
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const res = await api.get(`/submissions/${submissionId}`);
                setSubmission(res.data);
                if (res.data.status === "done" || res.data.status === "error") {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                }
            } catch (err) {
                // Polling hatası – sessizce devam et
            }
        }, 3000);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getScoreGradient = (score: number | null) => {
        if (score === null) return "from-slate-600 to-slate-500";
        if (score >= 80) return "from-emerald-500 to-emerald-400";
        if (score >= 60) return "from-yellow-500 to-yellow-400";
        return "from-red-500 to-red-400";
    };

    const getSimilarityColor = (sim: number | null) => {
        if (sim === null) return "text-slate-500";
        if (sim >= 0.9) return "text-red-400";
        if (sim >= 0.7) return "text-yellow-400";
        return "text-emerald-400";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Gönderim yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error || !submission) {
        return (
            <div className="text-center py-20">
                <p className="text-red-400 text-sm">{error || "Gönderim bulunamadı."}</p>
            </div>
        );
    }

    const status = statusConfig[submission.status] || statusConfig.pending;
    const isProcessing = submission.status === "pending" || submission.status === "processing";

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition">Dashboard</button>
                <svg className="w-4 h-4 text-slate-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                <button onClick={() => router.push("/dashboard/submissions")} className="text-slate-500 hover:text-white transition">Gönderimler</button>
                <svg className="w-4 h-4 text-slate-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                <span className="text-slate-300 font-medium">#{submission.id.slice(0, 8)}</span>
            </div>

            {/* Status banner */}
            {isProcessing && (
                <div className={`${status.bg} border ${status.border} rounded-2xl p-6 flex items-center gap-4`}>
                    <div className="w-12 h-12 rounded-xl bg-slate-900/60 flex items-center justify-center text-2xl animate-pulse">
                        {status.icon}
                    </div>
                    <div>
                        <p className={`font-semibold ${status.color}`}>{status.label}</p>
                        <p className="text-slate-400 text-sm mt-0.5">Kodunuz AI tarafından analiz ediliyor, her 3 saniyede güncelleniyor...</p>
                    </div>
                    <div className="ml-auto">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            )}

            {/* Score cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Main score */}
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-10 -mt-10 opacity-20 bg-gradient-to-br ${getScoreGradient(submission.score)}`} />
                    <p className="text-slate-400 text-xs font-medium">Skor</p>
                    <p className={`text-5xl font-extrabold mt-2 bg-clip-text text-transparent bg-gradient-to-r ${getScoreGradient(submission.score)}`}>
                        {submission.score !== null ? submission.score : "—"}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">/100</p>
                </div>

                {/* Similarity */}
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <p className="text-slate-400 text-xs font-medium">AI Benzerlik</p>
                    <p className={`text-3xl font-extrabold mt-2 ${getSimilarityColor(submission.similarity_score)}`}>
                        {submission.similarity_score !== null
                            ? `${(submission.similarity_score * 100).toFixed(1)}%`
                            : "—"}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">pgvector cosine</p>
                </div>

                {/* Status */}
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <p className="text-slate-400 text-xs font-medium">Durum</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.border} ${status.color}`}>
                            {status.icon} {status.label}
                        </span>
                    </div>
                    {submission.is_flagged && (
                        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">⚠️ Şüpheli işaretlendi</p>
                    )}
                </div>

                {/* Timing */}
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <p className="text-slate-400 text-xs font-medium">Zamanlar</p>
                    <div className="mt-2 space-y-1.5">
                        <p className="text-xs text-slate-300">📤 {formatDate(submission.submitted_at)}</p>
                        <p className="text-xs text-slate-300">📥 {formatDate(submission.processed_at)}</p>
                    </div>
                </div>
            </div>

            {/* Feedback */}
            {submission.feedback && (
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        🤖 AI Geri Bildirimi
                    </h2>
                    <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/40">
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                </div>
            )}

            {/* Test results (hstore) */}
            {submission.test_results && Object.keys(submission.test_results).length > 0 && (
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        🧪 Test Sonuçları
                        <span className="text-xs text-slate-500 font-normal bg-slate-800/60 px-2 py-0.5 rounded-lg">hstore</span>
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800/60">
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Test</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Sonuç</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {Object.entries(submission.test_results).map(([key, value]) => (
                                    <tr key={key} className="hover:bg-slate-800/20 transition">
                                        <td className="py-3 px-4 font-mono text-slate-300">{key}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                value === "pass" || value === "true"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : value === "fail" || value === "false"
                                                        ? "bg-red-500/10 text-red-400"
                                                        : "bg-slate-800 text-slate-300"
                                            }`}>
                                                {value}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Code view */}
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Gönderilen Kod</h2>
                    <span className="px-3 py-1 rounded-lg bg-slate-800/60 text-slate-400 text-xs font-medium uppercase">{submission.language}</span>
                </div>
                <div className="relative">
                    <pre className="p-6 text-sm text-slate-300 font-mono overflow-x-auto leading-relaxed bg-slate-950/60">
                        <code>{submission.code_text}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
}
