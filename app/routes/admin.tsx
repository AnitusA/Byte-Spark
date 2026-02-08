import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { User, Shield, ShieldAlert, CheckCircle, XCircle, Users } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    // Fetch all members with their clan information
    const { data: allMembers } = await supabase
        .from('members')
        .select('id, name, github_username, role, avatar_url, created_at, clans(name)')
        .order('role', { ascending: false })
        .order('name');

    // Categorize members by role
    const organizers = allMembers?.filter(m => m.role === 'organizer') || [];
    const captains = allMembers?.filter(m => m.role === 'captain') || [];
    const rookies = allMembers?.filter(m => m.role === 'rookie') || [];

    return { organizers, captains, rookies, session };
}

// Helper function to check if a member is linked (has a valid UUID as ID)
const isLinked = (id: string) => {
    // UUIDs are 36 characters with dashes, placeholder IDs are typically different
    return id && id.length === 36 && id.includes('-') && !id.startsWith('placeholder') && !id.startsWith('temp');
};

function MemberCard({ member, showLinkStatus }: { member: any; showLinkStatus: boolean }) {
    const linked = isLinked(member.id);

    return (
        <div className={`glass p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 border ${linked ? 'border-green-500/20' : 'border-yellow-500/20'} text-center md:text-left`}>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                    <User className="w-full h-full p-2 text-slate-500" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{member.name}</div>
                <div className="text-sm text-slate-500 truncate">
                    @{member.github_username}
                    {member.clans?.name && <span className="block md:inline md:ml-2 text-xs md:text-sm mt-1 md:mt-0 opacity-75">{member.clans.name}</span>}
                </div>
            </div>

            {showLinkStatus && (
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                    {linked ? (
                        <>
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-xs text-green-400 font-medium">Linked</span>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-5 h-5 text-yellow-400" />
                            <span className="text-xs text-yellow-400 font-medium">Not Linked</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Admin() {
    const { organizers, captains, rookies } = useLoaderData<typeof loader>();

    const linkedOrganizers = organizers.filter(m => isLinked(m.id)).length;
    const linkedCaptains = captains.filter(m => isLinked(m.id)).length;
    const linkedRookies = rookies.filter(m => isLinked(m.id)).length;

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="mb-8 md:mb-12">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                    <Users className="text-blue-500 w-6 h-6 md:w-8 md:h-8" />
                    Member Management
                </h1>
                <p className="text-slate-400 mt-1 md:mt-2 text-sm md:text-base">View all members and their GitHub linking status</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="glass p-4 md:p-6 rounded-2xl border border-red-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                        <h2 className="text-lg md:text-xl font-bold">Organizers</h2>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-red-400">{organizers.length}</div>
                    <div className="text-xs md:text-sm text-slate-500 mt-1">
                        {linkedOrganizers} linked • {organizers.length - linkedOrganizers} pending
                    </div>
                </div>

                <div className="glass p-4 md:p-6 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-blue-500 w-5 h-5 md:w-6 md:h-6" />
                        <h2 className="text-lg md:text-xl font-bold">Captains</h2>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-blue-400">{captains.length}</div>
                    <div className="text-xs md:text-sm text-slate-500 mt-1">
                        {linkedCaptains} linked • {captains.length - linkedCaptains} pending
                    </div>
                </div>

                <div className="glass p-4 md:p-6 rounded-2xl border border-green-500/20 col-span-1 sm:col-span-2 md:col-span-1">
                    <div className="flex items-center gap-3 mb-2">
                        <User className="text-green-500 w-5 h-5 md:w-6 md:h-6" />
                        <h2 className="text-lg md:text-xl font-bold">Rookies</h2>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-green-400">{rookies.length}</div>
                    <div className="text-xs md:text-sm text-slate-500 mt-1">
                        {linkedRookies} linked • {rookies.length - linkedRookies} pending
                    </div>
                </div>
            </div>

            {/* Organizers Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                    <ShieldAlert className="text-red-500 w-6 h-6" />
                    Organizers ({organizers.length})
                </h2>
                <div className="grid gap-4">
                    {organizers.map((member) => (
                        <MemberCard key={member.id} member={member} showLinkStatus={true} />
                    ))}
                    {organizers.length === 0 && (
                        <div className="text-center py-10 glass rounded-xl">
                            <p className="text-slate-500">No organizers found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Captains Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                    <Shield className="text-blue-500 w-6 h-6" />
                    Captain Bashers ({captains.length})
                </h2>
                <div className="grid gap-4">
                    {captains.map((member) => (
                        <MemberCard key={member.id} member={member} showLinkStatus={true} />
                    ))}
                    {captains.length === 0 && (
                        <div className="text-center py-10 glass rounded-xl">
                            <p className="text-slate-500">No captains found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Rookies Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                    <User className="text-green-500 w-6 h-6" />
                    Rookies ({rookies.length})
                </h2>
                <div className="grid gap-4">
                    {rookies.map((member) => (
                        <MemberCard key={member.id} member={member} showLinkStatus={false} />
                    ))}
                    {rookies.length === 0 && (
                        <div className="text-center py-10 glass rounded-xl">
                            <p className="text-slate-500">No rookies found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="glass p-6 rounded-2xl border border-slate-700">
                <h3 className="font-bold mb-4">Legend</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Linked</span>
                        <span className="text-slate-500">- User has logged in with GitHub and account is linked</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">Not Linked</span>
                        <span className="text-slate-500">- User needs to log in with GitHub to link their account</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
