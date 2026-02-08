import { redirect, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/utils/supabase.server";
import { Github, AlertCircle } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
    const { supabase } = createSupabaseClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        return redirect("/leaderboard");
    }

    const url = new URL(request.url);
    const error = url.searchParams.get("error");

    return { error };
}

export async function action({ request }: ActionFunctionArgs) {
    const { supabase, response } = createSupabaseClient(request);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${new URL(request.url).origin}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    return redirect(data.url, {
        headers: response.headers,
    });
}

export default function Login() {
    const { error } = useLoaderData<typeof loader>();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="glass p-6 md:p-8 rounded-2xl max-w-md w-full text-center space-y-5 md:space-y-6">
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Welcome Back</h1>
                <p className="text-slate-400 text-sm md:text-base">Sign in with GitHub to access the leaderboard and award points.</p>

                {error === "unauthorized" && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-200">
                            <p className="font-semibold mb-1">Access Denied</p>
                            <p className="text-red-300/90 text-xs md:text-sm">
                                Your GitHub username is not registered in our system. 
                                Please contact an organizer to get added to the member list.
                            </p>
                        </div>
                    </div>
                )}

                {error && error !== "unauthorized" && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 md:p-4 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form method="post">
                    <button type="submit" className="btn-primary w-full py-3 text-base md:text-lg">
                        <Github className="w-5 h-5 md:w-6 md:h-6" />
                        Sign in with GitHub
                    </button>
                </form>
            </div>
        </div>
    );
}
