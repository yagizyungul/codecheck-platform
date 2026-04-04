"use client";

import React from "react";
import { useAuth } from "../lib/auth";

interface NavbarProps {
    onMobileToggle?: () => void;
}

export default function Navbar({ onMobileToggle }: NavbarProps) {
    const { user, logout } = useAuth();

    return (
        <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Sol: Mobile toggle + Arama */}
            <div className="flex items-center gap-3 flex-1">
                {/* Mobile hamburger */}
                <button
                    onClick={onMobileToggle}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition lg:hidden"
                >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                </button>

                <div className="relative max-w-md w-full hidden sm:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Ara..."
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-slate-900/60 border border-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                    />
                </div>
            </div>

            {/* Sağ: Kullanıcı bilgisi & Logout */}
            <div className="flex items-center gap-2 sm:gap-4">
                {/* Bildirim */}
                <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
                </button>

                {/* Kullanıcı */}
                <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-800/60">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-white">{user?.full_name || "Kullanıcı"}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{user?.role || "—"}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition duration-200"
                        title="Çıkış Yap"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
