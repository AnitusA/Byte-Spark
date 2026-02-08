import { redirect, type LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    return redirect("/leaderboard");
}

export default function Index() {
    return null;
}
