import React from 'react';

export default function TeacherDashboard() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <div className="mb-4 md:mb-0 z-10 w-full">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Teacher Dashboard</h1>
                    <p className="text-slate-400 mt-1">Overview of your classes and recent submissions.</p>
                </div>
                <div className="flex gap-4 z-10">
                    <button className="whitespace-nowrap px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold transition duration-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]">Create Assignment</button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in-up">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Class Overview</h2>
                    <div className="flex flex-col gap-4">
                        <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-800/50 hover:border-emerald-500/30 transition duration-200 cursor-pointer">
                            <h3 className="font-semibold text-emerald-400 text-lg">CS 101 - Intro to Programming</h3>
                            <p className="text-sm text-slate-400 mt-1 flex items-center justify-between">
                                <span>Recent Topic: Variables</span>
                                <span className="bg-slate-950 px-2 py-1 rounded text-xs">45 Students</span>
                            </p>
                        </div>
                        <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-800/50 hover:border-emerald-500/30 transition duration-200 cursor-pointer">
                            <h3 className="font-semibold text-emerald-400 text-lg">CS 201 - Data Structures</h3>
                            <p className="text-sm text-slate-400 mt-1 flex items-center justify-between">
                                <span>Recent Topic: Binary Trees</span>
                                <span className="bg-slate-950 px-2 py-1 rounded text-xs">38 Students</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl xl:col-span-2">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Recent Submissions (Needs Review)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="pb-4 font-medium px-4">Student</th>
                                    <th className="pb-4 font-medium px-4">Assignment</th>
                                    <th className="pb-4 font-medium px-4">AI Score</th>
                                    <th className="pb-4 font-medium px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                <tr className="hover:bg-slate-800/30 transition duration-150">
                                    <td className="py-4 px-4 text-slate-200 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-bold">JD</div>
                                        <span className="font-medium">John Doe</span>
                                    </td>
                                    <td className="py-4 px-4 text-slate-400">CS 101 - HW1</td>
                                    <td className="py-4 px-4">
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-medium tracking-wide">92 / 100</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium transition">Review</button>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-800/30 transition duration-150">
                                    <td className="py-4 px-4 text-slate-200 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center text-xs font-bold">AS</div>
                                        <span className="font-medium">Alice Smith</span>
                                    </td>
                                    <td className="py-4 px-4 text-slate-400">CS 201 - Data Trees</td>
                                    <td className="py-4 px-4">
                                        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-md font-medium tracking-wide">65 / 100</span>
                                        <span className="ml-2 text-xs text-rose-400 font-medium">Flagged</span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium transition">Review</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
