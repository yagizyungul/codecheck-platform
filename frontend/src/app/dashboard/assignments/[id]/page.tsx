"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import api from "../../../lib/api";
import { useToast } from "../../../components/Toast";

interface Assignment {
    id: string;
    title: string;
    description: string;
    course_path: string;
    due_date: string | null;
    created_at: string;
}

const LANGUAGES = [
    { value: "python", label: "Python", icon: "🐍" },
    { value: "javascript", label: "JavaScript", icon: "🌐" },
    { value: "java", label: "Java", icon: "☕" },
    { value: "c", label: "C", icon: "⚡" },
    { value: "cpp", label: "C++", icon: "⚙️" },
];

export default function AssignmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const assignmentId = params.id as string;

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("python");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    // Mock Location States
    const [isTestMode, setIsTestMode] = useState(false);
    const [customLat, setCustomLat] = useState("");
    const [customLng, setCustomLng] = useState("");

    useEffect(() => {
        fetchAssignment();
    }, [assignmentId]);

    const fetchAssignment = async () => {
        try {
            const res = await api.get(`/assignments/${assignmentId}`);
            setAssignment(res.data);
        } catch (err: any) {
            console.error("Ödev yüklenemedi:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!code.trim()) {
            setSubmitError("Lütfen kodunuzu girin.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        setSubmitSuccess(null);

        try {
            const payload: any = {
                assignment_id: assignmentId,
                code_text: code,
                language,
            };

            if (isTestMode && customLat && customLng) {
                payload.custom_lat = parseFloat(customLat);
                payload.custom_lng = parseFloat(customLng);
            }

            const res = await api.post("/submissions", payload);
            setSubmitSuccess(res.data.id);
            toast("Kodunuz başarıyla gönderildi! Sonuç sayfasına yönlendiriliyorsunuz...", "success");
            // 2 saniye sonra submission detay sayfasına yönlendir
            setTimeout(() => {
                router.push(`/dashboard/submissions/${res.data.id}`);
            }, 2000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail || "Gönderim başarısız. Lütfen tekrar deneyin.";
            setSubmitError(errorMsg);
            toast(errorMsg, "error");
        } finally {
            setSubmitting(false);
        }
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

    const getDaysLeft = (dateStr: string | null) => {
        if (!dateStr) return null;
        return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Ödev yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/60 mb-4">
                    <svg className="w-8 h-8 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </div>
                <p className="text-slate-400 text-sm">Ödev bulunamadı.</p>
            </div>
        );
    }

    const daysLeft = getDaysLeft(assignment.due_date);
    const isOverdue = daysLeft !== null && daysLeft <= 0;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition">
                    Dashboard
                </button>
                <svg className="w-4 h-4 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-300 font-medium">{assignment.title}</span>
            </div>

            {/* Assignment info */}
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-white">{assignment.title}</h1>
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono">
                                {assignment.course_path}
                            </span>
                        </div>
                        <p className="text-slate-400 leading-relaxed max-w-2xl">{assignment.description}</p>
                    </div>

                    {daysLeft !== null && (
                        <div className={`px-4 py-2 rounded-xl text-sm font-medium border flex-shrink-0 ${
                            isOverdue
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : daysLeft <= 3
                                    ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}>
                            {isOverdue ? "⏰ Süresi dolmuş" : `📅 ${daysLeft} gün kaldı`}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Son tarih: {formatDate(assignment.due_date)}
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Oluşturulma: {formatDate(assignment.created_at)}
                    </div>
                </div>
            </div>

            {/* Code editor section */}
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Kod Gönder</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Kodunuzu yazın ve gönderin — AI tarafından analiz edilecek</p>
                    </div>

                    {/* Language selector */}
                    <div className="flex items-center gap-2">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.value}
                                onClick={() => setLanguage(lang.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                    language === lang.value
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : "bg-slate-800/60 text-slate-500 border border-slate-700/30 hover:text-slate-300"
                                }`}
                            >
                                {lang.icon} {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Code textarea */}
                <div className="relative">
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10">
                        <div className="w-3 h-3 rounded-full bg-red-500/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={`# ${assignment.title} çözümünüzü buraya yazın...\n\ndef solution():\n    pass`}
                        className="w-full h-96 p-4 pt-10 bg-slate-950 text-slate-200 font-mono text-sm resize-none focus:outline-none placeholder-slate-700 leading-relaxed"
                        spellCheck={false}
                        id="code-editor"
                    />
                    <div className="absolute bottom-4 right-4 text-xs text-slate-600">
                        {code.split("\n").length} satır · {code.length} karakter
                    </div>
                </div>

                {/* Submit area */}
                <div className="p-6 border-t border-slate-800/60">
                    {submitError && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            {submitError}
                        </div>
                    )}

                    {submitSuccess && (
                        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Kodunuz başarıyla gönderildi! Sonuç sayfasına yönlendiriliyorsunuz...
                        </div>
                    )}

                    {/* Test Modu (Manuel Konum Simülasyonu) */}
                    <div className="mb-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isTestMode}
                                    onChange={(e) => setIsTestMode(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
                                />
                                <span className="text-sm font-bold text-blue-400">Test Modu (Manuel Konum Simülasyonu)</span>
                            </label>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-500/50">Geliştirici Aracı</span>
                        </div>

                        {isTestMode && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Enlem (Latitude)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={customLat}
                                        onChange={(e) => setCustomLat(e.target.value)}
                                        placeholder="Örn: 39.9334 (Ankara)"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Boylam (Longitude)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={customLng}
                                        onChange={(e) => setCustomLng(e.target.value)}
                                        placeholder="Örn: 32.8597"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <p className="col-span-2 text-[10px] text-slate-500 italic">
                                    * Bu koordinatlar PostGIS üzerinde konumsal analizleri test etmek için kullanılacaktır.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            💡 Gönderdiğiniz kod AI tarafından analiz edilecek ve benzerlik kontrolünden geçirilecektir.
                        </p>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !!submitSuccess || !code.trim()}
                            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            id="submit-code-btn"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Gönderiliyor...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Kodu Gönder
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
