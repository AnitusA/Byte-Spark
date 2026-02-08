import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { User, Shield, Zap, Calendar, ArrowLeft } from "lucide-react";

export async function loader({ params, request }: LoaderFunctionArgs) {
    const { id } = params;
    const { supabase } = createSupabaseClient(request);

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

    return { member, transactions, totalPoints };
}

export default function Profile() {
    const { member, transactions, totalPoints } = useLoaderData<typeof loader>();

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
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Zap className="text-yellow-500 w-5 h-5" />
                    Points History
                </h2>

                {transactions && transactions.length > 0 ? (
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
                )}
            </div>
        </div>
    );
}
