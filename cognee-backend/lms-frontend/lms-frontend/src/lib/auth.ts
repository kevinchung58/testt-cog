import { auth } from "@clerk/nextjs/server";

export type UserRole = "admin" | "teacher" | "student";

export const getUserRole = (): UserRole | null => {
  const { sessionClaims } = auth();

  // The role is stored in the public metadata
  const role = sessionClaims?.publicMetadata?.role as UserRole | undefined;

  return role || null;
};
