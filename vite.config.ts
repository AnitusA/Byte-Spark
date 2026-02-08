import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.GITHUB_CLIENT_ID': JSON.stringify(env.GITHUB_CLIENT_ID),
      'process.env.GITHUB_CLIENT_SECRET': JSON.stringify(env.GITHUB_CLIENT_SECRET),
    },
  };
});
