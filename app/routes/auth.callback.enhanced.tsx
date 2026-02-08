import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";

/**
 * Enhanced Auth Callback with Automatic User Creation
 * 
 * This version automatically creates a member record when a user logs in for the first time.
 * 
 * To use this:
 * 1. Rename this file to auth.callback.tsx (backup the original first)
 * 2. Update the DEFAULT_ROLE and DEFAULT_CLAN_NAME constants below
 * 3. Optionally customize the role assignment logic
 */

const DEFAULT_ROLE = 'rookie'; // Default role for new users
const DEFAULT_CLAN_NAME = 'Alpha Bashers'; // Default clan for new users

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
                // Check if member record exists
                const { data: existingMember } = await supabase
                    .from('members')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                // If member doesn't exist, create one
                if (!existingMember) {
                    // Get default clan
                    const { data: defaultClan } = await supabase
                        .from('clans')
                        .select('id')
                        .eq('name', DEFAULT_CLAN_NAME)
                        .single();

                    // Get GitHub username from user metadata
                    const githubUsername = user.user_metadata?.user_name ||
                        user.user_metadata?.preferred_username ||
                        user.email?.split('@')[0] ||
                        'unknown';

                    // Create member record
                    const { error: insertError } = await supabase
                        .from('members')
                        .insert({
                            id: user.id,
                            name: user.user_metadata?.full_name || user.user_metadata?.name || githubUsername,
                            github_username: githubUsername.toLowerCase(),
                            clan_id: defaultClan?.id || null,
                            role: DEFAULT_ROLE,
                            avatar_url: user.user_metadata?.avatar_url || null,
                        });

                    if (insertError) {
                        console.error('Error creating member record:', insertError);
                        // Continue anyway - user can be created manually later
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
