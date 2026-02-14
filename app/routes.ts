import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/_index.tsx"),
    route("login", "routes/login.tsx"),
    route("leaderboard", "routes/leaderboard.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("captain", "routes/captain.tsx"),
    route("organizer", "routes/organizer.tsx"),
    route("admin", "routes/admin.tsx"),
    route("profile/:id", "routes/profile.$id.tsx"),
    route("auth/callback", "routes/auth.callback.tsx"),
] satisfies RouteConfig;
