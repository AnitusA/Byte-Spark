import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  TrendingUp,
  Award,
  Clock
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  member: {
    name: string;
    avatar_url: string | null;
  };
  given_by: {
    name: string;
  };
}

interface DailyData {
  [date: string]: {
    total: number;
    transactions: Transaction[];
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = createSupabaseClient(request);
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const yearParam = url.searchParams.get("year");

  const now = new Date();
  const targetMonth = monthParam ? parseInt(monthParam) : now.getMonth();
  const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();

  // Get first and last day of the month
  const firstDay = new Date(targetYear, targetMonth, 1);
  const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

  const { data: { session } } = await supabase.auth.getSession();

  // Fetch transactions - we'll filter by effective date after extraction
  // Fetch a wider range to catch transactions with description dates in this month
  const rangeStart = new Date(targetYear, targetMonth - 1, 1); // Previous month
  const rangeEnd = new Date(targetYear, targetMonth + 2, 0, 23, 59, 59); // Next month
  
  const { data: allTransactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      description,
      created_at,
      member:members!transactions_member_id_fkey (
        name,
        avatar_url
      ),
      given_by:members!transactions_given_by_id_fkey (
        name
      )
    `)
    .gte('created_at', rangeStart.toISOString())
    .lte('created_at', rangeEnd.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    return { 
      dailyData: {}, 
      month: targetMonth, 
      year: targetYear, 
      session,
      totalPoints: 0,
      totalTransactions: 0
    };
  }

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

  // Group transactions by date (using description date if available)
  const dailyData: DailyData = {};
  let totalPoints = 0;
  let transactionCount = 0;
  
  allTransactions?.forEach((transaction: any) => {
    const transDate = new Date(transaction.created_at);
    const effectiveDate = extractDateFromDescription(transaction.description, transDate);
    
    // Only include transactions whose effective date falls in the target month
    if (effectiveDate >= firstDay && effectiveDate <= lastDay) {
      const date = effectiveDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      if (!dailyData[date]) {
        dailyData[date] = {
          total: 0,
          transactions: []
        };
      }
      
      dailyData[date].total += transaction.amount;
      dailyData[date].transactions.push(transaction);
      totalPoints += transaction.amount;
      transactionCount++;
    }
  });

  return { 
    dailyData, 
    month: targetMonth, 
    year: targetYear, 
    session,
    totalPoints,
    totalTransactions: transactionCount
  };
}

export default function Calendar() {
  const { dailyData, month, year, session, totalPoints, totalTransactions } = useLoaderData<typeof loader>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get calendar grid data
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Create array of calendar cells
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const goToPreviousMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    return `/calendar?month=${newMonth}&year=${newYear}`;
  };

  const goToNextMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    return `/calendar?month=${newMonth}&year=${newYear}`;
  };

  const selectedData = selectedDate ? dailyData[selectedDate] : null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 md:py-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-2 flex-wrap">
          <CalendarIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
          <h1 className="text-xl sm:text-2xl md:text-5xl font-black tracking-tight text-white italic">
            POINTS <span className="text-blue-500">CALENDAR</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm md:text-lg font-medium text-center md:text-left">
          Track daily rookie points and achievements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="glass p-4 md:p-6 rounded-xl border border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-blue-500 w-5 h-5" />
            <h3 className="font-bold text-sm md:text-base">Total Points</h3>
          </div>
          <div className="text-2xl md:text-3xl font-black text-blue-400">{totalPoints}</div>
          <div className="text-xs text-slate-500 mt-1">This month</div>
        </div>

        <div className="glass p-4 md:p-6 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-green-500 w-5 h-5" />
            <h3 className="font-bold text-sm md:text-base">Transactions</h3>
          </div>
          <div className="text-2xl md:text-3xl font-black text-green-400">{totalTransactions}</div>
          <div className="text-xs text-slate-500 mt-1">Total entries</div>
        </div>

        <div className="glass p-4 md:p-6 rounded-xl border border-purple-500/20 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-purple-500 w-5 h-5" />
            <h3 className="font-bold text-sm md:text-base">Active Days</h3>
          </div>
          <div className="text-2xl md:text-3xl font-black text-purple-400">
            {Object.keys(dailyData).length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Days with points</div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="glass p-4 md:p-6 rounded-2xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <Link
            to={goToPreviousMonth()}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
          
          <h2 className="text-lg md:text-2xl font-bold">
            {monthNames[month]} {year}
          </h2>
          
          <Link
            to={goToNextMonth()}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {/* Day headers */}
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-xs md:text-sm font-bold text-slate-400 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dateKey = getDateKey(day);
            const dayData = dailyData[dateKey];
            const hasData = dayData && dayData.total > 0;
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
                  <span className="text-[10px] md:text-xs font-black text-blue-400 mt-0.5">
                    +{dayData.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal for daily breakdown */}
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
                  {selectedData.transactions.length} transaction{selectedData.transactions.length !== 1 ? 's' : ''} • Total: <span className="text-blue-400 font-bold">+{selectedData.total} points</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {selectedData.transactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 border border-slate-600 shrink-0">
                      {transaction.member.avatar_url ? (
                        <img 
                          src={transaction.member.avatar_url} 
                          alt={transaction.member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          {transaction.member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm md:text-base truncate">{transaction.member.name}</p>
                          <p className="text-xs text-slate-400">
                            Given by {transaction.given_by.name}
                          </p>
                        </div>
                        <span className={`
                          text-lg md:text-xl font-black shrink-0
                          ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}
                        `}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </div>
                      
                      {transaction.description && (
                        <p className="text-sm text-slate-300 mt-2 bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                          {transaction.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(transaction.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          to="/leaderboard"
          className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          View Leaderboard
        </Link>
        {session && (
          <Link
            to="/profile"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-medium"
          >
            My Profile
          </Link>
        )}
      </div>
    </div>
  );
}
