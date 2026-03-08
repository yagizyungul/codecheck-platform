"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const studentLinks = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/assignments",
        label: "Ödevler",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        href: "/dashboard/submissions",
        label: "Gönderimler",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
        ),
    },
];

const teacherExtraLinks = [
    {
        href: "/dashboard/students",
        label: "Öğrenciler",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const isTeacher = user?.role === "teacher";
    const links = isTeacher ? [...studentLinks, ...teacherExtraLinks] : studentLinks;

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/60 flex flex-col z-40">
            {/* Logo */}
            <div className="p-6 border-b border-slate-800/60">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-300">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-lg tracking-tight">CodeCheck</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Platform</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest px-3 mb-3">
                    Menü
                </p>
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${isActive
                                    ? isTeacher
                                        ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
                                        : "bg-blue-500/15 text-blue-400 shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                }`}
                        >
                            <span
                                className={`transition-colors duration-200 ${isActive
                                        ? isTeacher
                                            ? "text-emerald-400"
                                            : "text-blue-400"
                                        : "text-slate-500 group-hover:text-slate-300"
                                    }`}
                            >
                                {link.icon}
                            </span>
                            {link.label}
                            {isActive && (
                                <span
                                    className={`ml-auto w-1.5 h-1.5 rounded-full animate-pulse ${isTeacher ? "bg-emerald-400" : "bg-blue-400"
                                        }`}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User info at bottom */}
            <div className="p-4 border-t border-slate-800/60">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${isTeacher
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/20"
                            }`}
                    >
                        {user?.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {user?.full_name || "Kullanıcı"}
                        </p>
                        <p className="text-[11px] text-slate-500 capitalize">{user?.role || "—"}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
