"use client";

import { AuthProvider } from "../lib/auth";
import { ToastProvider } from "./Toast";

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
    );
}
