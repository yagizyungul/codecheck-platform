"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useToast } from "./Toast";

const studentLinks = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
        ),
        exact: true,
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
        href: "/dashboard/admin",
        label: "Admin Panel",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
        ),
    },
];

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { toast } = useToast();

    const currentRole = user?.role?.toLowerCase();
    const isTeacher = currentRole === "teacher" || currentRole === "admin";
    
    // Debug: Rolü konsola yazdır (sorun devam ederse buradan kontrol edeceğiz)
    // console.log("Current User Role:", user?.role);

    // Filtrelenmiş linkler: Öğretmenler "Gönderimler" sayfasını görmemeli.
    const baseLinks = isTeacher 
        ? studentLinks.filter(l => l.href !== "/dashboard/submissions")
        : studentLinks;
        
    const links = isTeacher ? [...baseLinks, ...teacherExtraLinks] : baseLinks;

    const isLinkActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onMobileClose}
                />
            )}

            <aside
                className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                {/* Logo */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onMobileClose}>
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors duration-300">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-lg tracking-tight">CodeCheck</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Platform</p>
                        </div>
                    </Link>

                    {/* Mobile close button */}
                    <button
                        onClick={onMobileClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition lg:hidden"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest px-3 mb-3">
                        Menü
                    </p>
                    {links.map((link) => {
                        const isActive = isLinkActive(link.href, (link as any).exact);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={onMobileClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                                    ${isActive
                                        ? "bg-blue-50 text-blue-600 shadow-none"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                            >
                                <span
                                    className={`transition-colors duration-200 ${isActive
                                            ? "text-blue-600"
                                            : "text-slate-400 group-hover:text-slate-600"
                                        }`}
                                >
                                    {link.icon}
                                </span>
                                {link.label}
                                {isActive && (
                                    <span
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"
                                    />
                                )}
                            </Link>
                        );
                    })}

                    {/* Admin section divider */}
                    {isTeacher && (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest px-3">
                                    Yönetim
                                </p>
                            </div>
                        </>
                    )}
                </nav>

                {/* User info at bottom */}
                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                            {user?.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                                {user?.full_name || "Kullanıcı"}
                            </p>
                            <p className="text-[11px] text-slate-500 capitalize">{user?.role || "—"}</p>
                        </div>
                        <button
                            onClick={() => {
                                toast("Başarıyla çıkış yapıldı", "success");
                                setTimeout(() => logout(), 500);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition duration-200"
                            title="Çıkış Yap"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
