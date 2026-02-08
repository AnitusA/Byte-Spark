import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { createSupabaseClient } from "./utils/supabase.server";
import React from "react";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  // Also get member details to show name in navbar
  let member = null;
  if (session) {
    const { data } = await supabase.from('members').select('name').eq('id', session.user.id).single();
    member = data;
  }

  return { session, member, env: { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY } };
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, response } = createSupabaseClient(request);
  await supabase.auth.signOut();
  return redirect("/login", {
    headers: response.headers,
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const session = data?.session;
  const member = data?.member;
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Close menu when route changes
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="min-h-screen flex flex-col overflow-x-hidden w-full">
          <nav className="glass sticky top-0 z-50 border-b border-white/5 bg-slate-900/60 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14 sm:h-16">
                {/* Logo */}
                <Link to="/leaderboard" className="flex-shrink-0 group min-w-0">
                  <span className="text-base sm:text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
                    Rookies
                    <span className="font-light text-slate-100 ml-1 hidden sm:inline">Leaderboard</span>
                  </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    {[
                      ['Leaderboard', '/leaderboard'],
                      ['Captain', '/captain'],
                      ['Organizer', '/organizer'],
                      ['Admin', '/admin']
                    ].map(([name, path]) => (
                      <NavLink
                        key={name}
                        to={path}
                        className={({ isActive }) =>
                          `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                            ? 'text-white bg-white/10 shadow-lg shadow-blue-500/10'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        {name}
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* User Profile / Login (Desktop) */}
                <div className="hidden md:block">
                  <div className="ml-4 flex items-center md:ml-6">
                    {session ? (
                      <div className="flex items-center gap-4">
                        {/* <Link
                          to={`/profile/${session.user.id}`}
                          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800 transition-all group"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                            {member?.name?.charAt(0) || 'U'}
                          </div>
                          <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                            {member?.name?.split(' ')[0] || ''}
                          </span>
                        </Link> */}
                        <form method="post" action="/">
                          <button type="submit" className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                            Logout
                          </button>
                        </form>
                      </div>
                    ) : (
                      <Link
                        to="/login"
                        className="btn-primary py-1.5 px-5 text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-95"
                      >
                        Login
                      </Link>
                    )}
                  </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="-mr-1 flex md:hidden">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    type="button"
                    className="relative inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors active:scale-95"
                  >
                    <span className="sr-only">Open main menu</span>
                    {isMenuOpen ? (
                      <svg className="block h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="block h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Menu - OUTSIDE nav, portaled to body level */}
          {isMenuOpen && (
            <div className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
              {/* Backdrop */}
              <div
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)' }}
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Drawer */}
              <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '280px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #334155' }}>

                {/* Drawer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>Menu</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    style={{ padding: '6px', color: '#94a3b8', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Nav Links */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', backgroundColor: '#0f172a' }}>
                  {[
                    ['Leaderboard', '/leaderboard', '🏆'],
                    ['Captain', '/captain', '⚔️'],
                    ['Organizer', '/organizer', '📋'],
                    ['Admin', '/admin', '⚙️']
                  ].map(([name, path, icon]) => (
                    <NavLink
                      key={name}
                      to={path}
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-300'
                        }`
                      }
                    >
                      <span className="text-lg">{icon}</span>
                      {name}
                    </NavLink>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
                  {session ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: '#334155' }}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white" style={{ flexShrink: 0 }}>
                          {member?.name?.charAt(0) || 'U'}
                        </div>
                        {/* <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member?.name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Logged in</div>
                        </div> 
                      </div> */}
                      <form method="post" action="/">
                        <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 500, fontSize: '14px', backgroundColor: 'transparent', cursor: 'pointer' }}>
                          Log Out
                        </button>
                      </form>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="btn-primary w-full py-2.5 justify-center text-base font-bold"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-x-hidden w-full">
            {children}
          </main>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
