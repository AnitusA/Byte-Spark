import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Printer, Download, Calendar, User, Filter } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return { error: "unauthorized", members: [], memberData: null, session: null };
    }

    // Check if user is captain or organizer
    const { data: currentUser } = await supabase
        .from('members')
        .select('id, role, clan_id')
        .eq('auth_user_id', session.user.id)
        .single();

    if (!currentUser || !['captain', 'organizer'].includes(currentUser.role)) {
        return { error: "access_denied", members: [], memberData: null, session };
    }

    // Get URL parameters for filtering
    const url = new URL(request.url);
    const selectedMemberId = url.searchParams.get("member");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");

    // Fetch members based on role permissions
    const membersQuery = supabase
        .from('members')
        .select('id, name, avatar_url, role, clans(name)')
        .eq('role', 'rookie');

    if (currentUser.role === 'captain') {
        membersQuery.eq('clan_id', currentUser.clan_id);
    }

    const { data: members } = await membersQuery.order('name');

    let memberData = null;
    if (selectedMemberId && members?.find(m => m.id === selectedMemberId)) {
        // Fetch detailed transaction data for selected member
        let transactionsQuery = supabase
            .from('transactions')
            .select(`
                id,
                amount,
                description,
                created_at,
                given_by:members!transactions_given_by_id_fkey(name, role)
            `)
            .eq('member_id', selectedMemberId)
            .order('created_at', { ascending: false });

        // Apply date filters if provided
        if (fromDate) {
            transactionsQuery = transactionsQuery.gte('created_at', fromDate);
        }
        if (toDate) {
            transactionsQuery = transactionsQuery.lte('created_at', `${toDate}T23:59:59`);
        }

        const { data: transactions } = await transactionsQuery;
        const selectedMember = members.find(m => m.id === selectedMemberId);

        if (transactions && selectedMember) {
            // Group transactions by date and category with smart parsing
            const dateMatrix = new Map<string, Map<string, number>>();
            const categoriesSet = new Set<string>();
            const datesSet = new Set<string>();

            // Helper function to parse description and extract category + date
            const parseDescription = (description: string, transactionDate: Date) => {
                if (!description) return { category: 'Uncategorized', date: transactionDate.toISOString().split('T')[0] };
                
                // Check if description has format like "CG-09/02" or "SOMETHING-dd/mm"
                const datePattern = /^(.+?)-(\d{1,2})\/(\d{1,2})$/;
                const match = description.match(datePattern);
                
                if (match) {
                    const [, categoryPart, day, month] = match;
                    const currentYear = new Date().getFullYear();
                    
                    // Parse day and month - ensure they're valid numbers
                    const dayNum = parseInt(day);
                    const monthNum = parseInt(month);
                    
                    // Validate ranges
                    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
                        console.warn(`Invalid date values from "${description}": day=${dayNum}, month=${monthNum}`);
                        return { 
                            category: description.trim(),
                            date: transactionDate.toISOString().split('T')[0] 
                        };
                    }
                    
                    // Use UTC to avoid timezone issues - format: YYYY-MM-DD
                    const year = currentYear;
                    const isoDate = `${year}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                    
                    // Validate that this creates a valid date
                    const testDate = new Date(isoDate + 'T00:00:00');
                    if (testDate.getDate() !== dayNum || testDate.getMonth() + 1 !== monthNum) {
                        console.warn(`Date validation failed for "${description}": expected day=${dayNum}, month=${monthNum}, got day=${testDate.getDate()}, month=${testDate.getMonth() + 1}`);
                        return { 
                            category: description.trim(),
                            date: transactionDate.toISOString().split('T')[0] 
                        };
                    }
                    
                    return {
                        category: categoryPart.trim().toUpperCase(),
                        date: isoDate
                    };
                } else {
                    // No date pattern found, use full description as category
                    return {
                        category: description.trim(),
                        date: transactionDate.toISOString().split('T')[0]
                    };
                }
            };

            transactions.forEach(transaction => {
                const { category, date } = parseDescription(transaction.description, new Date(transaction.created_at));
                
                categoriesSet.add(category);
                datesSet.add(date);

                if (!dateMatrix.has(date)) {
                    dateMatrix.set(date, new Map());
                }

                const dateMap = dateMatrix.get(date)!;
                const currentAmount = dateMap.get(category) || 0;
                dateMap.set(category, currentAmount + transaction.amount);
            });

            // Convert sets to sorted arrays
            const categories = Array.from(categoriesSet).sort();
            const dates = Array.from(datesSet).sort();

            // Category summary using parsed categories
            const categorySummary = new Map<string, {
                description: string;
                total: number;
                positive: number;
                negative: number;
                count: number;
                transactions: any[];
            }>();

            transactions.forEach(transaction => {
                const { category } = parseDescription(transaction.description, new Date(transaction.created_at));
                const existing = categorySummary.get(category) || {
                    description: category,
                    total: 0,
                    positive: 0,
                    negative: 0,
                    count: 0,
                    transactions: []
                };

                existing.total += transaction.amount;
                existing.count += 1;
                existing.transactions.push(transaction);

                if (transaction.amount > 0) {
                    existing.positive += transaction.amount;
                } else {
                    existing.negative += transaction.amount;
                }

                categorySummary.set(category, existing);
            });

            memberData = {
                member: selectedMember,
                transactions,
                categorySummary: Array.from(categorySummary.values()).sort((a, b) => a.description.localeCompare(b.description)),
                dateMatrix,
                categories,
                dates,
                totalPoints: transactions.reduce((sum, t) => sum + t.amount, 0),
                totalPositive: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
                totalNegative: transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0),
                transactionCount: transactions.length,
                dateRange: { from: fromDate, to: toDate }
            };
        }
    }

    return {
        error: null,
        members: members || [],
        memberData,
        session,
        currentUser
    };
}

export default function PointsReport() {
    const { error, members, memberData, currentUser } = useLoaderData<typeof loader>();
    const [selectedMemberId, setSelectedMemberId] = useState(memberData?.member?.id || "");
    const [fromDate, setFromDate] = useState(memberData?.dateRange?.from || "");
    const [toDate, setToDate] = useState(memberData?.dateRange?.to || "");
    const [showPrintView, setShowPrintView] = useState(false);

    if (error === "unauthorized") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Access Required</h2>
                    <p className="text-slate-400 mb-6">Please log in to view points reports.</p>
                    <Link to="/login" className="btn-primary">Login</Link>
                </div>
            </div>
        );
    }

    if (error === "access_denied") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                    <p className="text-slate-400 mb-6">Only captains and organizers can access points reports.</p>
                    <Link to="/leaderboard" className="btn-primary">Back to Leaderboard</Link>
                </div>
            </div>
        );
    }

    const handleGenerateReport = () => {
        if (!selectedMemberId) return;
        
        const params = new URLSearchParams();
        params.set('member', selectedMemberId);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        
        window.location.href = `/points-report?${params.toString()}`;
    };

    const handlePrint = () => {
        setShowPrintView(true);
        setTimeout(() => {
            window.print();
            setTimeout(() => setShowPrintView(false), 100);
        }, 100);
    };

    const handleExportCSV = () => {
        if (!memberData) return;

        // Create matrix CSV with dates as rows and categories as columns
        const csvLines = [];
        
        // Header row
        const headers = ['Date', ...memberData.categories, 'Daily Total'];
        csvLines.push(headers.join(','));

        // Data rows
        memberData.dates.forEach(date => {
            const row = [date];
            let dailyTotal = 0;
            
            memberData.categories.forEach(category => {
                const points = memberData.dateMatrix.get(date)?.get(category) || 0;
                row.push(points.toString());
                dailyTotal += points;
            });
            
            row.push(dailyTotal.toString());
            csvLines.push(row.join(','));
        });

        // Totals row
        const totalsRow = ['TOTALS'];
        memberData.categories.forEach(category => {
            const categoryTotal = memberData.categorySummary.find(c => c.description === category)?.total || 0;
            totalsRow.push(categoryTotal.toString());
        });
        totalsRow.push(memberData.totalPoints.toString());
        csvLines.push(totalsRow.join(','));

        const csvContent = csvLines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${memberData.member.name}-points-matrix-report.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className={`${showPrintView ? 'print-view' : ''} max-w-6xl mx-auto px-4 py-6 md:py-12`}>
            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-view { font-size: 12px; }
                    .print-view table { break-inside: auto; }
                    body { background: white !important; }
                }
            `}</style>

            <div className="no-print mb-6">
                <Link 
                    to="/leaderboard" 
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Leaderboard
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Filter className="text-blue-500 w-8 h-8" />
                            Points Report
                        </h1>
                        <p className="text-slate-400 mt-2">
                            Generate detailed point breakdowns by category for {currentUser?.role === 'captain' ? 'your clan members' : 'any rookie'}.
                        </p>
                    </div>
                    {memberData && (
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="glass p-6 rounded-2xl mb-8 border border-slate-700">
                    <h3 className="text-lg font-bold mb-4">Report Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Select Member
                            </label>
                            <select
                                value={selectedMemberId}
                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">Choose a member...</option>
                                {members.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} - {member.clans?.name || 'No Clan'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleGenerateReport}
                                disabled={!selectedMemberId}
                                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {memberData && (
                <div className="space-y-8">
                    {/* Member Header */}
                    <div className="glass p-6 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                                    {memberData.member.avatar_url ? (
                                        <img 
                                            src={memberData.member.avatar_url} 
                                            alt={memberData.member.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-full h-full p-4 text-slate-500" />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">{memberData.member.name}</h2>
                                <p className="text-slate-400">
                                    {memberData.member.clans?.name || 'No Clan'} • {memberData.member.role}
                                </p>
                                {(fromDate || toDate) && (
                                    <p className="text-sm text-blue-400 mt-1">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        {fromDate || 'Start'} to {toDate || 'Now'}
                                    </p>
                                )}
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-blue-400">
                                    {memberData.totalPoints}
                                </div>
                                <div className="text-sm text-slate-400 uppercase tracking-wider">
                                    Total Points
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-xl border border-green-500/20">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">
                                    +{memberData.totalPositive}
                                </div>
                                <div className="text-sm text-slate-400 mt-1">Positive Points</div>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border border-red-500/20">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-400">
                                    {memberData.totalNegative}
                                </div>
                                <div className="text-sm text-slate-400 mt-1">Negative Points</div>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border border-purple-500/20">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-400">
                                    {memberData.transactionCount}
                                </div>
                                <div className="text-sm text-slate-400 mt-1">Total Transactions</div>
                            </div>
                        </div>
                    </div>

                    {/* Points Matrix Table - Categories as columns, Dates as rows */}
                    <div className="glass p-6 rounded-2xl border border-slate-700 overflow-x-auto">
                        <h3 className="text-xl font-bold mb-6">Points Matrix - By Date & Category</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm matrix-table">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left p-3 font-bold text-slate-300 sticky left-0 bg-slate-900/90">Date</th>
                                        {memberData.categories.map(category => (
                                            <th key={category} className="text-center p-2 font-bold text-blue-400 min-w-[100px]">
                                                <div className="truncate font-black text-sm" title={category}>
                                                    {category}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="text-center p-3 font-bold text-green-400 sticky right-0 bg-slate-900/95 z-10">Daily Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {memberData.dates.map((date, dateIndex) => {
                                        const dailyTotal = memberData.categories.reduce((sum, category) => {
                                            return sum + (memberData.dateMatrix.get(date)?.get(category) || 0);
                                        }, 0);
                                        
                                        return (
                                            <tr 
                                                key={date}
                                                className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${
                                                    dateIndex % 2 === 0 ? 'bg-slate-800/10' : ''
                                                }`}
                                            >
                                                <td className="p-3 font-medium sticky left-0 bg-slate-900/90 border-r border-slate-700">
                                                    <div className="text-slate-300">
                                                        {new Date(date).toLocaleDateString('en-US', { 
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </div>
                                                </td>
                                                {memberData.categories.map(category => {
                                                    const points = memberData.dateMatrix.get(date)?.get(category) || 0;
                                                    return (
                                                        <td key={category} className="p-2 text-center">
                                                            {points !== 0 ? (
                                                                <span className={`font-bold ${
                                                                    points > 0 ? 'text-green-400' : 'text-red-400'
                                                                }`}>
                                                                    {points > 0 ? '+' : ''}{points}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-3 text-center font-bold sticky right-0 bg-slate-900/90 border-l border-slate-700">
                                                    <span className={`${
                                                        dailyTotal > 0 ? 'text-green-400' : 
                                                        dailyTotal < 0 ? 'text-red-400' : 'text-slate-400'
                                                    }`}>
                                                        {dailyTotal > 0 ? '+' : ''}{dailyTotal}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Category Totals Row */}
                                    <tr className="border-t-2 border-blue-500/50 bg-blue-500/10 font-bold">
                                        <td className="p-3 text-lg sticky left-0 bg-blue-500/30 border-r border-slate-700 z-10">
                                            TOTALS
                                        </td>
                                        {memberData.categories.map(category => {
                                            const categoryTotal = memberData.categorySummary.find(c => c.description === category)?.total || 0;
                                            return (
                                                <td key={category} className="p-2 text-center">
                                                    <span className={`font-bold ${
                                                        categoryTotal > 0 ? 'text-green-400' : 
                                                        categoryTotal < 0 ? 'text-red-400' : 'text-slate-400'
                                                    }`}>
                                                        {categoryTotal > 0 ? '+' : ''}{categoryTotal}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-3 text-center text-lg sticky right-0 bg-blue-500/30 border-l border-slate-700 z-10">
                                            <span className={`${
                                                memberData.totalPoints > 0 ? 'text-green-400' : 
                                                memberData.totalPoints < 0 ? 'text-red-400' : 'text-slate-400'
                                            }`}>
                                                {memberData.totalPoints > 0 ? '+' : ''}{memberData.totalPoints}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Negative Points Summary - Separate table showing only minus points */}
                    <div className="glass p-6 rounded-2xl border border-red-500/20 overflow-x-auto">
                        <h3 className="text-xl font-bold mb-6 text-red-400">Negative Points Only</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm matrix-table">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left p-3 font-bold text-slate-300 sticky left-0 bg-slate-900/90">Date</th>
                                        {memberData.categories.map(category => (
                                            <th key={category} className="text-center p-2 font-bold text-red-400 min-w-[100px]">
                                                <div className="truncate font-black text-sm" title={category}>
                                                    {category}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="text-center p-3 font-bold text-red-400 sticky right-0 bg-slate-900/90">Daily Minus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {memberData.dates.filter(date => {
                                        // Only show dates that have negative points
                                        const dailyNegative = memberData.categories.reduce((sum, category) => {
                                            const points = memberData.dateMatrix.get(date)?.get(category) || 0;
                                            return sum + (points < 0 ? points : 0);
                                        }, 0);
                                        return dailyNegative < 0;
                                    }).map((date, dateIndex) => {
                                        const dailyNegative = memberData.categories.reduce((sum, category) => {
                                            const points = memberData.dateMatrix.get(date)?.get(category) || 0;
                                            return sum + (points < 0 ? points : 0);
                                        }, 0);
                                        
                                        return (
                                            <tr 
                                                key={date}
                                                className={`border-b border-slate-800/50 hover:bg-red-500/5 ${
                                                    dateIndex % 2 === 0 ? 'bg-red-500/5' : ''
                                                }`}
                                            >
                                                <td className="p-3 font-medium sticky left-0 bg-slate-900/90 border-r border-slate-700">
                                                    <div className="text-slate-300">
                                                        {new Date(date).toLocaleDateString('en-US', { 
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </div>
                                                </td>
                                                {memberData.categories.map(category => {
                                                    const points = memberData.dateMatrix.get(date)?.get(category) || 0;
                                                    return (
                                                        <td key={category} className="p-2 text-center">
                                                            {points < 0 ? (
                                                                <span className="font-bold text-red-400">
                                                                    {points}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-700">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-3 text-center font-bold sticky right-0 bg-slate-900/90 border-l border-slate-700">
                                                    <span className="text-red-400">
                                                        {dailyNegative}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {memberData.dates.filter(date => {
                                        const dailyNegative = memberData.categories.reduce((sum, category) => {
                                            const points = memberData.dateMatrix.get(date)?.get(category) || 0;
                                            return sum + (points < 0 ? points : 0);
                                        }, 0);
                                        return dailyNegative < 0;
                                    }).length === 0 && (
                                        <tr>
                                            <td colSpan={memberData.categories.length + 2} className="p-8 text-center text-slate-500">
                                                🎉 No negative points found! Great job!
                                            </td>
                                        </tr>
                                    )}
                                    {/* Negative Totals Row */}
                                    {memberData.totalNegative < 0 && (
                                        <tr className="border-t-2 border-red-500/50 bg-red-500/10 font-bold">
                                            <td className="p-3 text-lg sticky left-0 bg-red-500/20 border-r border-slate-700">
                                                TOTAL MINUS
                                            </td>
                                            {memberData.categories.map(category => {
                                                const categoryNegative = memberData.categorySummary.find(c => c.description === category)?.negative || 0;
                                                return (
                                                    <td key={category} className="p-2 text-center">
                                                        {categoryNegative < 0 ? (
                                                            <span className="font-bold text-red-400">
                                                                {categoryNegative}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-700">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-center text-lg sticky right-0 bg-red-500/20 border-l border-slate-700">
                                                <span className="text-red-400">{memberData.totalNegative}</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="glass p-6 rounded-2xl border border-slate-700 no-print">
                        <h3 className="text-xl font-bold mb-6">Recent Transactions</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {memberData.transactions.slice(0, 10).map((transaction) => {
                                // Parse the description to show both original and extracted info
                                const parseTransactionDisplay = (description: string) => {
                                    if (!description) return { original: 'No description', parsed: null };
                                    
                                    const datePattern = /^(.+?)-(\d{1,2})\/(\d{1,2})$/;
                                    const match = description.match(datePattern);
                                    
                                    if (match) {
                                        const [, categoryPart, day, month] = match;
                                        return {
                                            original: description,
                                            parsed: {
                                                category: categoryPart.trim().toUpperCase(),
                                                date: `${day.padStart(2, '0')}/${month.padStart(2, '0')}`
                                            }
                                        };
                                    }
                                    return { original: description, parsed: null };
                                };

                                const display = parseTransactionDisplay(transaction.description);

                                return (
                                    <div 
                                        key={transaction.id}
                                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-blue-400">
                                                {display.original}
                                            </p>
                                            {display.parsed && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    → Category: <span className="text-green-400">{display.parsed.category}</span> • 
                                                    Date: <span className="text-yellow-400">{display.parsed.date}</span>
                                                </p>
                                            )}
                                            <p className="text-sm text-slate-400">
                                                By {transaction.given_by?.name} • {new Date(transaction.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className={`text-xl font-bold ${
                                            transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                                        </div>
                                    </div>
                                );
                            })}
                            {memberData.transactions.length > 10 && (
                                <p className="text-center text-slate-400 text-sm">
                                    Showing 10 of {memberData.transactions.length} transactions
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!memberData && (
                <div className="text-center py-12">
                    <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-400 mb-2">No Report Generated</h3>
                    <p className="text-slate-500">
                        Select a member and optional date range above to generate a detailed points report.
                    </p>
                </div>
            )}
        </div>
    );
}