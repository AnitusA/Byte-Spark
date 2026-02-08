import { redirect, useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { invalidateCache } from "~/utils/cache.server";
import { User, ShieldAlert, Zap, PlusCircle } from "lucide-react";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return redirect("/login");

    // Fetch current user details using auth_user_id
    const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

    if (!member || member.role !== 'organizer') {
        return redirect("/leaderboard?error=Access Denied: Organizer role required");
    }

    // Fetch all ROOKIES from all clans (organizers can award points to all rookies)
    const { data: allRookies } = await supabase
        .from('members')
        .select('id, name, avatar_url, role, clans(name)')
        .eq('role', 'rookie')  // Only fetch rookies
        .order('name');

    return { member, allRookies: allRookies || [] };
}

export async function action({ request }: ActionFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return redirect("/login");

    // Get the organizer's member record to use their member ID
    const { data: organizer } = await supabase
        .from('members')
        .select('id, role')
        .eq('auth_user_id', session.user.id)
        .single();

    if (!organizer || organizer.role !== 'organizer') {
        return { error: "Unauthorized" };
    }

    const formData = await request.formData();
    const rookieIds = formData.getAll("rookieId") as string[];
    const amount = parseInt(formData.get("amount") as string);
    const description = formData.get("description") as string;

    if (!rookieIds.length || isNaN(amount) || amount === 0) {
        return { error: "Select at least one rookie. Points cannot be zero." };
    }

    const transactions = rookieIds.map(id => ({
        member_id: id,
        amount: amount,
        description: description,
        given_by_id: organizer.id
    }));

    const { error } = await supabase.from('transactions').insert(transactions);

    if (error) {
        return { error: error.message };
    }

    invalidateCache('leaderboard');
    return { success: true, count: rookieIds.length };
}

export default function Organizer() {
    const { allRookies } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [showPointsForm, setShowPointsForm] = useState(false);
    const [selectedRookies, setSelectedRookies] = useState<string[]>([]);

    const toggleRookie = (id: string) => {
        setSelectedRookies(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedRookies.length === allRookies.length) {
            setSelectedRookies([]);
        } else {
            setSelectedRookies(allRookies.map((r: any) => r.id));
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                        <ShieldAlert className="text-red-500 w-6 h-6 md:w-8 md:h-8" />
                        Organizer Central
                    </h1>
                    <button
                        onClick={() => setShowPointsForm(!showPointsForm)}
                        className="btn-primary !bg-red-600 hover:!bg-red-500 text-sm md:text-base py-2 md:py-2.5"
                    >
                        <Zap className="w-4 h-4" />
                        Give Points
                    </button>
                </div>
                <p className="text-slate-400 mt-2 text-sm md:text-base">Oversee all rookies and manage global points attribution.</p>
            </div>

            {actionData?.success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Points distributed to {actionData.count} rookie{actionData.count > 1 ? 's' : ''} successfully!
                </div>
            )}

            {actionData?.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {actionData.error}
                </div>
            )}

            {/* Give Points Form */}
            {showPointsForm && (
                <div className="glass p-5 md:p-6 rounded-2xl mb-6 border-red-500/20">
                    <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Award Points
                    </h2>
                    <form method="post" className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">Select Rookies *</label>
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    {selectedRookies.length === allRookies.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                {allRookies.map((rookie: any) => (
                                    <label
                                        key={rookie.id}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                                            selectedRookies.includes(rookie.id)
                                                ? 'bg-red-600/20 border border-red-500/40'
                                                : 'bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name="rookieId"
                                            value={rookie.id}
                                            checked={selectedRookies.includes(rookie.id)}
                                            onChange={() => toggleRookie(rookie.id)}
                                            className="accent-red-500 w-4 h-4 shrink-0"
                                        />
                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                            {rookie.avatar_url ? (
                                                <img src={rookie.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-full h-full p-1 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="truncate block">{rookie.name}</span>
                                            <span className="text-[10px] text-slate-500">{rookie.clans?.name}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {selectedRookies.length > 0 && (
                                <p className="text-xs text-red-400 mt-2">{selectedRookies.length} rookie{selectedRookies.length > 1 ? 's' : ''} selected</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Points *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    placeholder="+/- Pts"
                                    required
                                    className="input-field w-full text-sm md:text-base"
                                    min="-5000"
                                    max="5000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
                                <input
                                    type="text"
                                    name="description"
                                    placeholder="Official reason"
                                    required
                                    className="input-field w-full text-sm md:text-base"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="submit" className="btn-primary !bg-red-600 hover:!bg-red-700 flex-1 justify-center">
                                <PlusCircle className="w-4 h-4" />
                                Award Points
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPointsForm(false)}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Rookies List */}
            <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                All Rookies ({allRookies.length})
            </h2>
            <div className="grid gap-3">
                {allRookies.map((rookie: any) => (
                    <div key={rookie.id} className="glass p-4 rounded-xl flex items-center gap-3 border-transparent hover:border-red-500/20 transition-all">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                            {rookie.avatar_url ? (
                                <img src={rookie.avatar_url} alt={rookie.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-full h-full p-2 text-slate-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm md:text-base truncate">{rookie.name}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">{rookie.clans?.name}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRookies(prev =>
                                    prev.includes(rookie.id) ? prev : [...prev, rookie.id]
                                );
                                setShowPointsForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                        >
                            <Zap className="w-3 h-3" />
                            Give
                        </button>
                    </div>
                ))}

                {allRookies.length === 0 && (
                    <div className="text-center py-16 glass rounded-2xl">
                        <p className="text-slate-500">No rookies found in the database.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
