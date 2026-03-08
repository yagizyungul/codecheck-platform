"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import api from "../lib/api";

interface Assignment {
    id: string;
    title: string;
    description: string;
    course_path: string;
    due_date: string | null;
    created_at: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const res = await api.get("/assignments");
            setAssignments(res.data.assignments);
        } catch (err: any) {
            setError("Ödevler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const getDaysLeft = (dateStr: string | null) => {
        if (!dateStr) return null;
        const diff = Math.ceil(
            (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return diff;
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Welcome header */}
            <div>
                <h1 className="text-3xl font-bold text-white">
                    Hoş geldin,{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        {user?.full_name || "Kullanıcı"}
                    </span>
                    👋
                </h1>
                <p className="text-slate-400 mt-1">
                    İşte güncel ödevlerin ve istatistiklerin.
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition" />
                    <p className="text-slate-400 text-sm font-medium">Toplam Ödev</p>
                    <p className="text-4xl font-extrabold text-blue-400 mt-2 tracking-tight">
                        {loading ? "—" : assignments.length}
                    </p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition" />
                    <p className="text-slate-400 text-sm font-medium">Yaklaşan</p>
                    <p className="text-4xl font-extrabold text-emerald-400 mt-2 tracking-tight">
                        {loading
                            ? "—"
                            : assignments.filter(
                                (a) => getDaysLeft(a.due_date) !== null && getDaysLeft(a.due_date)! > 0
                            ).length}
                    </p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition" />
                    <p className="text-slate-400 text-sm font-medium">Rol</p>
                    <p className="text-4xl font-extrabold text-indigo-400 mt-2 tracking-tight capitalize">
                        {user?.role || "—"}
                    </p>
                </div>
            </div>

            {/* Assignments list */}
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Ödev Listesi</h2>
                    <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
                        {assignments.length} ödev
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm">Henüz ödev bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {assignments.map((assignment) => {
                            const daysLeft = getDaysLeft(assignment.due_date);
                            const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;
                            const isOverdue = daysLeft !== null && daysLeft <= 0;

                            return (
                                <div
                                    key={assignment.id}
                                    className="p-5 rounded-xl border border-slate-800/50 bg-slate-800/20 hover:bg-slate-800/40 transition-all duration-200 cursor-pointer group flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-medium text-white group-hover:text-blue-400 transition truncate">
                                                {assignment.title}
                                            </h3>
                                            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono">
                                                {assignment.course_path}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 truncate">
                                            {assignment.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Son tarih</p>
                                            <p className="text-sm text-slate-300 font-medium">
                                                {formatDate(assignment.due_date)}
                                            </p>
                                        </div>
                                        {daysLeft !== null && (
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium border ${isOverdue
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                        : isUrgent
                                                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    }`}
                                            >
                                                {isOverdue
                                                    ? "Süresi dolmuş"
                                                    : `${daysLeft} gün kaldı`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
