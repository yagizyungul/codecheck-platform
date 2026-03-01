import React from 'react';

export default function StudentDashboard() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8 shadow-sm">
                <div className="mb-4 md:mb-0">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Student Dashboard</h1>
                    <p className="text-slate-400 mt-1">Welcome back. Here are your latest assignments and analysis results.</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)]">Upload Code</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl xl:col-span-2">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Recent Assignments</h2>
                    <div className="flex flex-col gap-4">
                        <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/30 flex justify-between items-center hover:bg-slate-800/80 transition duration-200 cursor-pointer group">
                            <div>
                                <h3 className="font-medium text-slate-200 group-hover:text-blue-400 transition">Data Structures - HW1</h3>
                                <p className="text-sm text-slate-400 mt-1">Due in 2 days</p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium">Pending</span>
                        </div>
                        <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/30 flex justify-between items-center hover:bg-slate-800/80 transition duration-200 cursor-pointer group">
                            <div>
                                <h3 className="font-medium text-slate-200 group-hover:text-blue-400 transition">Algorithms - HW3</h3>
                                <p className="text-sm text-slate-400 mt-1">Submitted yesterday</p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">Analyzed (95/100)</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Quick Stats</h2>
                    <div className="flex flex-col gap-4">
                        <div className="p-5 bg-slate-800/30 border border-slate-800/50 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <p className="text-slate-400 text-sm font-medium">Average Score</p>
                            <p className="text-4xl font-extrabold text-blue-400 mt-2 tracking-tight">92<span className="text-2xl text-blue-400/50">%</span></p>
                        </div>
                        <div className="p-5 bg-slate-800/30 border border-slate-800/50 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <p className="text-slate-400 text-sm font-medium">Scripts Analyzed</p>
                            <p className="text-4xl font-extrabold text-indigo-400 mt-2 tracking-tight">14</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
