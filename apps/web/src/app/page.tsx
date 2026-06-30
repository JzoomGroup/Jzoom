import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { postLoginRoute } from "../lib/route-access";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/login");
  }
  if (user.mustChangePassword) {
    return redirect("/change-password");
  }

  return redirect(postLoginRoute(user.roles));
}
