"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import api from "../lib/api";
import Link from "next/link";

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
                <h1 className="text-3xl font-bold text-slate-900">
                    Hoş geldin, {user?.full_name || "Kullanıcı"}
                </h1>
                <p className="text-slate-500 mt-1">
                    İşte güncel ödevlerin ve istatistiklerin.
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-slate-500 text-sm font-medium">Toplam Ödev</p>
                    <p className="text-4xl font-extrabold text-blue-600 mt-2 tracking-tight">
                        {loading ? "—" : assignments.length}
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-slate-500 text-sm font-medium">Yaklaşan</p>
                    <p className="text-4xl font-extrabold text-emerald-600 mt-2 tracking-tight">
                        {loading
                            ? "—"
                            : assignments.filter(
                                (a) => getDaysLeft(a.due_date) !== null && getDaysLeft(a.due_date)! > 0
                            ).length}
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-slate-500 text-sm font-medium">Rol</p>
                    <p className="text-4xl font-extrabold text-indigo-600 mt-2 tracking-tight capitalize">
                        {user?.role || "—"}
                    </p>
                </div>
            </div>

            {/* Assignments list */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Ödev Listesi</h2>
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                        {assignments.length} ödev
                    </span>
                </div>

                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                </div>
                                <div className="w-24 h-8 bg-slate-100 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-500 text-sm">{error}</p>
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
                                <Link
                                    key={assignment.id}
                                    href={`/dashboard/assignments/${assignment.id}`}
                                    className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-200 transition-all duration-200 cursor-pointer group flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition truncate">
                                                {assignment.title}
                                            </h3>
                                            <span className="text-[10px] text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded font-mono">
                                                {assignment.course_path}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {assignment.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Son tarih</p>
                                            <p className="text-sm text-slate-700 font-medium">
                                                {formatDate(assignment.due_date)}
                                            </p>
                                        </div>
                                        {daysLeft !== null && (
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${isOverdue
                                                        ? "bg-red-50 text-red-600 border border-red-100"
                                                        : isUrgent
                                                            ? "bg-yellow-50 text-yellow-600 border border-yellow-100"
                                                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                    }`}
                                            >
                                                {isOverdue
                                                    ? "Süresi dolmuş"
                                                    : `${daysLeft} gün kaldı`}
                                            </span>
                                        )}
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
