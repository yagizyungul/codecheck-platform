import Image from "next/image";

export default function Home() {
    return (
        <main className="flex-grow flex flex-col items-center justify-center p-24 bg-gradient-to-b from-slate-900 to-slate-950 text-white min-h-screen">
            <div className="flex items-center justify-center mb-8 animate-fade-in-up">
                <div className="px-4 py-1.5 rounded-full border border-slate-700/60 bg-slate-800/40 backdrop-blur-md text-sm font-medium text-slate-300 shadow-sm flex items-center gap-3">
                    <span>CodeCheck Platform</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <code className="font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Frontend</code>
                </div>
            </div>

            <div className="relative flex place-items-center flex-col gap-8 text-center animate-fade-in-up">
                <h1 className="text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">
                    Welcome to CodeCheck
                </h1>
                <p className="text-xl text-slate-300 max-w-2xl">
                    An interactive, AI-powered code analysis platform.
                    Upload your code, select your analysis criteria, and let our agents review it.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <a href="/student/dashboard" className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 font-semibold transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2">
                        Student Dashboard
                    </a>
                    <a href="/teacher/dashboard" className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 font-semibold transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2">
                        Teacher Dashboard
                    </a>
                </div>
            </div>
        </main>
    );
}
