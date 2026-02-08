import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { getCached, setCache } from "~/utils/cache.server";
import { useRef } from "react";
import { User, Trophy, Search, AlertCircle, Medal, Crown } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const url = new URL(request.url);
    const error = url.searchParams.get("error");

    const { data: { session } } = await supabase.auth.getSession();

    // Check cache first
    const cacheKey = 'leaderboard';
    const cached = getCached<any[]>(cacheKey);

    if (cached) {
        return { rookies: cached, session, error };
    }

    const { data, error: dbError } = await supabase
        .from('members')
        .select(`
      id,
      name,
      avatar_url,
      role,
      auth_user_id,
      clans (name),
      transactions!transactions_member_id_fkey (amount)
    `)
        .eq('role', 'rookie');

    if (dbError) {
        console.error("Error fetching leaderboard:", dbError);
        return { rookies: [], session, error };
    }

    const rookiesWithPoints = data.map((rookie: any) => ({
        ...rookie,
        totalPoints: rookie.transactions.reduce((sum: number, t: any) => sum + t.amount, 0)
    })).sort((a, b) => b.totalPoints - a.totalPoints);

    // Cache for 30 seconds
    setCache(cacheKey, rookiesWithPoints);

    return { rookies: rookiesWithPoints, session, error };
}

export default function Leaderboard() {
    const { rookies, session, error } = useLoaderData<typeof loader>();
    const userRef = useRef<HTMLAnchorElement>(null);

    const findMe = () => {
        if (userRef.current) {
            userRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            userRef.current.animate([
                { outline: '2px solid transparent', backgroundColor: 'transparent' },
                { outline: '2px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                { outline: '2px solid transparent', backgroundColor: 'transparent' }
            ], { duration: 2000, easing: 'ease-in-out' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8 md:py-12 animate-in fade-in duration-500 w-full">
            {/* Mobile-Optimized Error Alert */}
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3 md:p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm">
                        <p className="font-bold text-red-200 uppercase tracking-wide">Access Denied</p>
                        <p className="text-red-300/80 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Header Section: Stacked on Mobile, Row on Desktop */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
                <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2 flex-wrap">
                        <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 shrink-0" />
                        <h1 className="text-xl sm:text-2xl md:text-5xl font-black tracking-tight text-white italic leading-tight break-words">
                            ROOKIE <span className="text-blue-500">BOARD</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm md:text-lg font-medium">
                        The quest for the top basher continues.
                    </p>
                </div>

                {session && rookies.some(r => r.auth_user_id === session.user.id) && (
                    <button
                        onClick={findMe}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/25 text-sm md:text-base"
                    >
                        <Search className="w-4 h-4" />
                        Find My Rank
                    </button>
                )}
            </div>

            {/* Leaderboard List */}
            <div className="grid gap-2 md:gap-3">
                {rookies.map((rookie, index) => {
                    const isCurrentUser = session?.user?.id === rookie.auth_user_id;
                    const rank = index + 1;
                    
                    return (
                        <Link
                            key={rookie.id}
                            to={`/profile/${rookie.id}`}
                            ref={isCurrentUser ? userRef : null}
                            className={`
                                group relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300
                                bg-slate-900/40 border backdrop-blur-sm
                                ${isCurrentUser 
                                    ? 'border-blue-500/50 bg-blue-500/10' 
                                    : 'border-white/5 active:bg-white/5'}
                            `}
                        >
                            {/* Rank: Smaller on Mobile */}
                            <div className="w-8 md:w-10 flex justify-center items-center">
                                {rank === 1 ? (
                                    <Crown className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                                ) : rank === 2 ? (
                                    <Medal className="text-slate-300 w-5 h-5 md:w-7 md:h-7" />
                                ) : rank === 3 ? (
                                    <Medal className="text-orange-500 w-5 h-5 md:w-7 md:h-7" />
                                ) : (
                                    <span className="text-base md:text-lg font-black text-slate-600 italic">
                                        {rank}
                                    </span>
                                )}
                            </div>

                            {/* Avatar: Responsive sizing */}
                            <div className={`
                                relative w-10 h-10 md:w-14 md:h-14 rounded-full p-0.5 shrink-0
                                ${rank === 1 ? 'bg-gradient-to-tr from-yellow-500 to-yellow-200' : 'bg-slate-700'}
                            `}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-2 border-slate-900">
                                    {rookie.avatar_url ? (
                                        <img src={rookie.avatar_url} alt={rookie.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-full h-full p-2 md:p-3 text-slate-500" />
                                    )}
                                </div>
                            </div>

                            {/* Rookie Identity: Truncated to prevent overflow */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-slate-100 text-sm md:text-lg truncate">
                                        {rookie.name}
                                    </h3>
                                    {isCurrentUser && (
                                        <span className="shrink-0 text-[8px] md:text-[10px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded uppercase">
                                            You
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] md:text-sm text-slate-500 font-medium truncate">
                                    {rookie.clans?.name || 'Independent'}
                                </p>
                            </div>

                            {/* Scoring: Larger numbers, smaller labels */}
                            <div className="text-right pl-2 shrink-0">
                                <div className={`text-lg md:text-2xl font-black tabular-nums tracking-tight ${rank <= 3 ? 'text-white' : 'text-blue-400'}`}>
                                    {rookie.totalPoints.toLocaleString()}
                                </div>
                                <div className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black tracking-wide md:tracking-widest">
                                    
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Empty State */}
                {rookies.length === 0 && (
                    <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-dashed border-white/10">
                        <Trophy className="w-8 h-8 text-slate-700 mx-auto mb-3 opacity-30" />
                        <p className="text-slate-400 text-sm font-medium">No contenders found yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}