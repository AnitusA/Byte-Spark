import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { User, Shield, Zap, Calendar, ArrowLeft, ChevronLeft, ChevronRight, X, List, CalendarDays } from "lucide-react";
import { useState } from "react";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    created_at: string;
    given_by: {
        name: string;
        role: string;
    };
}

interface DailyData {
    [date: string]: {
        total: number;
        byDescription: {
            [description: string]: {
                total: number;
                count: number;
                transactions: Transaction[];
            };
        };
    };
}

export async function loader({ params, request }: LoaderFunctionArgs) {
    const { id } = params;
    const { supabase } = createSupabaseClient(request);
    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");

    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam) : now.getMonth();
    const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();

    // Fetch rookie data with clan information
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select(`
      *,
      clans (name, logo_url)
    `)
        .eq('id', id)
        .single();

    if (memberError || !member) {
        throw new Response("Not Found", { status: 404 });
    }

    // Fetch transaction history
    const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select(`
      *,
      given_by:members!transactions_given_by_id_fkey (name, role)
    `)
        .eq('member_id', id)
        .order('created_at', { ascending: false });

    const totalPoints = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Get calendar data for the selected month
    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // Helper function to extract date from description (format: something-dd/mm)
    const extractDateFromDescription = (description: string, transactionDate: Date) => {
        if (!description) return transactionDate;
        
        // Match pattern: anything followed by -dd/mm at the end
        const datePattern = /-(\d{1,2})\/(\d{1,2})$/;
        const match = description.match(datePattern);
        
        if (match) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // Month is 0-indexed
            
            // Use the year from the transaction or current year
            const year = transactionDate.getFullYear();
            
            // Validate the extracted date
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                return new Date(year, month, day);
            }
        }
        
        // Fall back to transaction date if no pattern found
        return transactionDate;
    };

    const monthTransactions = transactions?.filter(t => {
        const transDate = new Date(t.created_at);
        const effectiveDate = extractDateFromDescription(t.description, transDate);
        return effectiveDate >= firstDay && effectiveDate <= lastDay;
    }) || [];

    // Group transactions by date and description
    const dailyData: DailyData = {};
    let monthTotal = 0;

    monthTransactions.forEach((transaction: any) => {
        const transDate = new Date(transaction.created_at);
        const effectiveDate = extractDateFromDescription(transaction.description, transDate);
        const date = effectiveDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const desc = transaction.description || 'No description';

        if (!dailyData[date]) {
            dailyData[date] = {
                total: 0,
                byDescription: {}
            };
        }

        if (!dailyData[date].byDescription[desc]) {
            dailyData[date].byDescription[desc] = {
                total: 0,
                count: 0,
                transactions: []
            };
        }

        dailyData[date].total += transaction.amount;
        dailyData[date].byDescription[desc].total += transaction.amount;
        dailyData[date].byDescription[desc].count += 1;
        dailyData[date].byDescription[desc].transactions.push(transaction);
        monthTotal += transaction.amount;
    });

    return { 
        member, 
        transactions, 
        totalPoints, 
        dailyData, 
        month: targetMonth, 
        year: targetYear,
        monthTotal,
        monthTransactionCount: monthTransactions.length
    };
}

export default function Profile() {
    const { member, transactions, totalPoints, dailyData, month, year, monthTotal, monthTransactionCount } = useLoaderData<typeof loader>();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Calendar calculations
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    const getDateKey = (day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const goToPreviousMonth = () => {
        const newMonth = month === 0 ? 11 : month - 1;
        const newYear = month === 0 ? year - 1 : year;
        return `/profile/${member.id}?month=${newMonth}&year=${newYear}`;
    };

    const goToNextMonth = () => {
        const newMonth = month === 11 ? 0 : month + 1;
        const newYear = month === 11 ? year + 1 : year;
        return `/profile/${member.id}?month=${newMonth}&year=${newYear}`;
    };

    const selectedData = selectedDate ? dailyData[selectedDate] : null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
            <Link 
                to="/leaderboard" 
                className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors mb-4 md:mb-6 text-sm md:text-base"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Leaderboard
            </Link>

            <div className="glass p-6 md:p-8 rounded-2xl md:rounded-3xl mb-8 md:mb-12 flex flex-col items-center gap-6 md:gap-8 border-blue-500/20">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-slate-800 border-2 border-blue-500/50 shadow-xl shadow-blue-500/10 shrink-0">
                    {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-full h-full p-5 md:p-6 text-slate-500" />
                    )}
                </div>

                <div className="flex-1 text-center w-full">
                    <h1 className="text-2xl md:text-3xl font-bold mb-3">{member.name}</h1>
                    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                        <div className="flex items-center gap-1.5 text-blue-400">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs md:text-sm font-medium uppercase tracking-wider">{member.clans?.name || 'No Clan'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <User className="w-4 h-4" />
                            <span className="text-xs md:text-sm font-medium uppercase tracking-wider">{member.role}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-600/10 border border-blue-500/20 p-5 md:p-6 rounded-xl md:rounded-2xl text-center w-full md:w-auto md:min-w-[140px]">
                    <div className="text-3xl md:text-4xl font-black text-blue-400">{totalPoints}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-1">Total Points</div>
                </div>
            </div>

            <div className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <Zap className="text-yellow-500 w-5 h-5" />
                        Points History
                    </h2>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                viewMode === 'list' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <List className="w-4 h-4" />
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                viewMode === 'calendar' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Calendar
                        </button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    // List View
                    transactions && transactions.length > 0 ? (
                        <div className="grid gap-3 md:gap-4">
                            {transactions.map((t) => (
                                <div key={t.id} className="glass p-4 md:p-6 rounded-xl md:rounded-2xl border-transparent hover:border-slate-700 transition-colors">
                                    <div className="flex items-start justify-between gap-3 md:gap-4">
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="font-medium text-slate-200 text-sm md:text-base break-words">{t.description || 'Participation bonus'}</p>
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </div>
                                                {t.given_by && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        <span className="truncate">By {t.given_by.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`text-lg md:text-xl font-bold shrink-0 ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {t.amount >= 0 ? '+' : ''}{t.amount}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 md:py-20 bg-slate-900/40 rounded-2xl md:rounded-3xl border border-dashed border-slate-700">
                            <p className="text-slate-500 text-sm md:text-base">No transactions recorded for this profile.</p>
                        </div>
                    )
                ) : (
                    // Calendar View
                    <div>
                        {/* Month Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="glass p-4 rounded-xl border border-blue-500/20">
                                <div className="text-2xl font-black text-blue-400">{monthTotal}</div>
                                <div className="text-xs text-slate-500 mt-1">Points this month</div>
                            </div>
                            <div className="glass p-4 rounded-xl border border-green-500/20">
                                <div className="text-2xl font-black text-green-400">{monthTransactionCount}</div>
                                <div className="text-xs text-slate-500 mt-1">Transactions</div>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="glass p-4 md:p-6 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center justify-between mb-6">
                                <Link
                                    to={goToPreviousMonth()}
                                    className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                </Link>
                                
                                <h3 className="text-lg md:text-xl font-bold">
                                    {monthNames[month]} {year}
                                </h3>
                                
                                <Link
                                    to={goToNextMonth()}
                                    className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-7 gap-1 md:gap-2">
                                {daysOfWeek.map(day => (
                                    <div key={day} className="text-center text-xs md:text-sm font-bold text-slate-400 py-2">
                                        {day}
                                    </div>
                                ))}

                                {calendarDays.map((day, index) => {
                                    if (day === null) {
                                        return <div key={`empty-${index}`} className="aspect-square" />;
                                    }

                                    const dateKey = getDateKey(day);
                                    const dayData = dailyData[dateKey];
                                    const hasData = dayData && dayData.total !== 0;
                                    const isToday = 
                                        day === new Date().getDate() && 
                                        month === new Date().getMonth() && 
                                        year === new Date().getFullYear();

                                    return (
                                        <button
                                            key={dateKey}
                                            onClick={() => hasData && setSelectedDate(dateKey)}
                                            className={`
                                                aspect-square p-1 md:p-2 rounded-lg transition-all
                                                flex flex-col items-center justify-center
                                                ${isToday ? 'ring-2 ring-blue-500' : ''}
                                                ${hasData 
                                                    ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 cursor-pointer border border-blue-500/30' 
                                                    : 'bg-slate-800/30 border border-slate-700/30'
                                                }
                                            `}
                                        >
                                            <span className={`text-xs md:text-sm font-bold ${hasData ? 'text-white' : 'text-slate-500'}`}>
                                                {day}
                                            </span>
                                            {hasData && (
                                                <span className={`text-[10px] md:text-xs font-black mt-0.5 ${
                                                    dayData.total > 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {dayData.total > 0 ? '+' : ''}{dayData.total}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for daily breakdown grouped by description */}
            {selectedDate && selectedData && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedDate(null)}
                >
                    <div 
                        className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 p-4 md:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Total: <span className={`font-bold ${selectedData.total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {selectedData.total > 0 ? '+' : ''}{selectedData.total} points
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Transactions grouped by description */}
                        <div className="space-y-4">
                            {Object.entries(selectedData.byDescription).map(([description, data]) => (
                                <div key={description} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    {/* Description Header */}
                                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-700/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-base text-blue-400 break-words">{description}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {data.count} transaction{data.count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <span className={`text-xl font-black shrink-0 ml-3 ${
                                            data.total > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {data.total > 0 ? '+' : ''}{data.total}
                                        </span>
                                    </div>

                                    {/* Individual transactions */}
                                    <div className="space-y-2">
                                        {data.transactions.map((transaction) => (
                                            <div 
                                                key={transaction.id}
                                                className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between gap-3"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-300">
                                                        Given by <span className="font-medium text-white">{transaction.given_by.name}</span>
                                                        <span className="text-xs text-slate-500 ml-2">
                                                            ({transaction.given_by.role})
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {new Date(transaction.created_at).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </p>
                                                </div>
                                                <span className={`text-base font-bold shrink-0 ${
                                                    transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
