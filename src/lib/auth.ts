import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demoUserId")?.value;
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    redirect(roleHome(user.role as Role));
  }

  return user;
}

export function roleHome(role: Role) {
  if (role === "EMPLOYEE") return "/employee";
  if (role === "MANAGER") return "/manager";
  return "/admin";
}
