"use client";

import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";

export default function LoginPage() {
    const { login, register } = useAuth();
    const { toast } = useToast();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isRegister) {
                await register(email, username, password, fullName);
                toast("Kayıt başarılı! Giriş yapılıyor...", "success");
            } else {
                await login(email, password);
                toast("Giriş başarılı! Yönlendiriliyorsunuz...", "success");
            }
        } catch (err: any) {
            toast(
                err.response?.data?.detail || "İşlem başarısız. Lütfen tekrar deneyin.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-sm">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        CodeCheck
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">
                        {isRegister ? "Yeni hesap oluşturun" : "Platforma giriş yapın"}
                    </p>
                </div>

                {/* Login/Register Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isRegister && (
                            <>
                                <div>
                                    <label htmlFor="fullName" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        Ad Soyad
                                    </label>
                                    <input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        placeholder="John Doe"
                                        className="block w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition duration-200"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="username" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        Kullanıcı Adı
                                    </label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        placeholder="johndoe"
                                        className="block w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition duration-200"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Email Adresi
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="ornek@codecheck.dev"
                                className="block w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition duration-200"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Şifre
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="block w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition duration-200"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                isRegister ? "Kaydediliyor..." : "Giriş yapılıyor..."
                            ) : (
                                isRegister ? "Kayıt Ol" : "Giriş Yap"
                            )}
                        </button>

                        {!loading && (
                            <button
                                type="button"
                                onClick={() => setIsRegister(!isRegister)}
                                className="w-full py-3 px-4 rounded-xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all duration-200"
                            >
                                {isRegister ? "Giriş Sayfasına Dön" : "Hesap Oluştur"}
                            </button>
                        )}
                    </form>

                    {!isRegister && (
                        <>
                            {/* Divider */}
                            <div className="mt-8 flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Test Hesapları</span>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>

                            {/* Test credentials */}
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmail("teacher@codecheck.dev");
                                        setPassword("teacher123");
                                    }}
                                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition duration-200"
                                >
                                    Öğretmen
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmail("student1@codecheck.dev");
                                        setPassword("student123");
                                    }}
                                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition duration-200"
                                >
                                    Öğrenci
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-8">
                    CodeCheck Platform © 2026
                </p>
            </div>
        </div>
    );
}
