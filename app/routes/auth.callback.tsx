import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") || "/leaderboard";

    if (code) {
        const { supabase, response } = createSupabaseClient(request);
        const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

        if (!authError) {
            // Get the authenticated user
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get GitHub username from user metadata
                const githubUsername = (
                    user.user_metadata?.user_name ||
                    user.user_metadata?.preferred_username ||
                    user.email?.split('@')[0] ||
                    'unknown'
                ).toLowerCase();

                console.log('GitHub Login - Username:', githubUsername, 'Auth ID:', user.id);

                // Check if a member with this GitHub username already exists in the database
                const { data: existingMember } = await supabase
                    .from('members')
                    .select('*')
                    .eq('github_username', githubUsername)
                    .single();

                // AUTHORIZATION CHECK: Only allow login if GitHub username is in database
                if (!existingMember) {
                    console.log('Authorization denied - GitHub username not found in database:', githubUsername);
                    // Sign out the user immediately
                    await supabase.auth.signOut();
                    return redirect("/login?error=unauthorized");
                }

                console.log('Found existing member:', existingMember);

                // Check if this member is already linked to this auth user
                if (existingMember.auth_user_id !== user.id) {
                    console.log('Linking account - Member ID:', existingMember.id, 'Auth User ID:', user.id);

                    // Link the member to this auth user
                    const { error: updateError } = await supabase
                        .from('members')
                        .update({
                            auth_user_id: user.id,
                            avatar_url: user.user_metadata?.avatar_url || existingMember.avatar_url,
                        })
                        .eq('id', existingMember.id);

                    if (updateError) {
                        console.error('Error linking account:', updateError);
                    } else {
                        console.log('Successfully linked account!');
                    }
                } else {
                    console.log('Account already linked correctly');
                    
                    // Update avatar if changed
                    if (user.user_metadata?.avatar_url && user.user_metadata.avatar_url !== existingMember.avatar_url) {
                        await supabase
                            .from('members')
                            .update({ avatar_url: user.user_metadata.avatar_url })
                            .eq('id', existingMember.id);
                    }
                }
            }

            return redirect(next, {
                headers: response.headers,
            });
        }
    }

    return redirect("/login?error=Could not authenticate with GitHub");
}
