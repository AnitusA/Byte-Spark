import { redirect, useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { invalidateCache } from "~/utils/cache.server";
import { User, Shield, Zap, PlusCircle, UserPlus } from "lucide-react";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return redirect("/login");

    // Fetch current user details using auth_user_id
    const { data: member } = await supabase
        .from('members')
        .select('*, clans(name)')
        .eq('auth_user_id', session.user.id)
        .single();

    if (!member || (member.role !== 'captain' && member.role !== 'organizer')) {
        return redirect("/leaderboard?error=Access Denied");
    }

    // Fetch ONLY ROOKIES of the same clan (captains can only award points to rookies)
    const { data: clanMembers } = await supabase
        .from('members')
        .select('id, name, avatar_url, role')
        .eq('clan_id', member.clan_id)
        .eq('role', 'rookie');

    return { member, clanMembers: clanMembers || [] };
}

export async function action({ request }: ActionFunctionArgs) {
    const { supabase, response } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return redirect("/login");

    // Get the captain's member record to use their member ID and clan
    const { data: captain } = await supabase
        .from('members')
        .select('id, role, clan_id')
        .eq('auth_user_id', session.user.id)
        .single();

    if (!captain || (captain.role !== 'captain' && captain.role !== 'organizer')) {
        return { error: "Unauthorized" };
    }

    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    // Handle adding a new rookie
    if (intent === "addRookie") {
        const name = formData.get("name") as string;
        const githubUsernameInput = (formData.get("githubUsername") as string)?.toLowerCase().trim();

        if (!name) {
            return { error: "Name is required" };
        }

        // Generate unique github username if not provided
        let githubUsername = githubUsernameInput;
        if (!githubUsername) {
            // Create a unique username from name + random string
            const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            githubUsername = `${baseUsername}-${randomSuffix}`;
        }

        // Check if GitHub username already exists
        const { data: existingMember } = await supabase
            .from('members')
            .select('id')
            .eq('github_username', githubUsername)
            .single();

        if (existingMember) {
            return { error: "A member with this GitHub username already exists. Try again." };
        }

        // Insert new rookie
        const { error } = await supabase.from('members').insert({
            name: name,
            github_username: githubUsername,
            clan_id: captain.clan_id,
            role: 'rookie',
        });

        if (error) {
            return { error: error.message };
        }

        return { successAdd: true, message: `${name} added to your clan!` };
    }

    // Handle awarding points
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
        given_by_id: captain.id
    }));

    const { error } = await supabase.from('transactions').insert(transactions);

    if (error) {
        return { error: error.message };
    }

    invalidateCache('leaderboard');
    return { success: true, count: rookieIds.length };
}

export default function Captain() {
    const { member, clanMembers } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPointsForm, setShowPointsForm] = useState(false);
    const [selectedRookies, setSelectedRookies] = useState<string[]>([]);

    const toggleRookie = (id: string) => {
        setSelectedRookies(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedRookies.length === clanMembers.length) {
            setSelectedRookies([]);
        } else {
            setSelectedRookies(clanMembers.map((r: any) => r.id));
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                        <Shield className="text-blue-500 w-6 h-6 md:w-8 md:h-8" />
                        Captain's Dashboard
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setShowPointsForm(!showPointsForm); setShowAddForm(false); }}
                            className="btn-primary text-sm md:text-base py-2 md:py-2.5"
                        >
                            <Zap className="w-4 h-4" />
                            Give Points
                        </button>
                        <button
                            onClick={() => { setShowAddForm(!showAddForm); setShowPointsForm(false); }}
                            className="px-4 py-2 md:py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm md:text-base flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Rookie
                        </button>
                    </div>
                </div>
                <p className="text-slate-400 mt-2 text-sm md:text-base">Award points to the brave rookies of <span className="text-blue-400 font-semibold">{member.clans?.name}</span>.</p>
            </div>

            {actionData?.success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Points awarded to {actionData.count} rookie{actionData.count > 1 ? 's' : ''} successfully!
                </div>
            )}

            {actionData?.successAdd && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {actionData.message}
                </div>
            )}

            {actionData?.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {actionData.error}
                </div>
            )}

            {/* Give Points Form */}
            {showPointsForm && (
                <div className="glass p-5 md:p-6 rounded-2xl mb-6 border-blue-500/20">
                    <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Award Points
                    </h2>
                    <form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="award" />

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">Select Rookies *</label>
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    {selectedRookies.length === clanMembers.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                {clanMembers.map((rookie: any) => (
                                    <label
                                        key={rookie.id}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                                            selectedRookies.includes(rookie.id)
                                                ? 'bg-blue-600/20 border border-blue-500/40'
                                                : 'bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name="rookieId"
                                            value={rookie.id}
                                            checked={selectedRookies.includes(rookie.id)}
                                            onChange={() => toggleRookie(rookie.id)}
                                            className="accent-blue-500 w-4 h-4 shrink-0"
                                        />
                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                            {rookie.avatar_url ? (
                                                <img src={rookie.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-full h-full p-1 text-slate-500" />
                                            )}
                                        </div>
                                        <span className="truncate">{rookie.name}</span>
                                    </label>
                                ))}
                            </div>
                            {selectedRookies.length > 0 && (
                                <p className="text-xs text-blue-400 mt-2">{selectedRookies.length} rookie{selectedRookies.length > 1 ? 's' : ''} selected</p>
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
                                    min="-1000"
                                    max="1000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
                                <input
                                    type="text"
                                    name="description"
                                    placeholder="Reason for awarding"
                                    required
                                    className="input-field w-full text-sm md:text-base"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="submit" className="btn-primary flex-1 justify-center">
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

            {/* Add Rookie Form */}
            {showAddForm && (
                <div className="glass p-5 md:p-6 rounded-2xl mb-6 border-blue-500/20">
                    <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        Add New Rookie to Your Clan
                    </h2>
                    <form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="addRookie" />
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Rookie Name *</label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Enter full name"
                                required
                                className="input-field w-full"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="btn-primary">
                                <UserPlus className="w-4 h-4" />
                                Add Rookie
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
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
                Clan Rookies ({clanMembers.length})
            </h2>
            <div className="grid gap-3">
                {clanMembers.map((rookie: any) => (
                    <div key={rookie.id} className="glass p-4 rounded-xl flex items-center gap-3 border-transparent hover:border-blue-500/20 transition-all">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                            {rookie.avatar_url ? (
                                <img src={rookie.avatar_url} alt={rookie.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-full h-full p-2 text-slate-500" />
                            )}
                        </div>
                        <div className="font-semibold text-sm md:text-base truncate flex-1">{rookie.name}</div>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRookies(prev =>
                                    prev.includes(rookie.id) ? prev : [...prev, rookie.id]
                                );
                                setShowPointsForm(true);
                                setShowAddForm(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                        >
                            <Zap className="w-3 h-3" />
                            Give
                        </button>
                    </div>
                ))}

                {clanMembers.length === 0 && (
                    <div className="text-center py-16 glass rounded-2xl">
                        <p className="text-slate-500">No rookies found in your clan.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
