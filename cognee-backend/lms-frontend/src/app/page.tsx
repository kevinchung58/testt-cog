import { auth, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  const { userId } = auth();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">LMS Foundation</h1>
        <p className="text-lg text-center sm:text-left">
          This is the foundation for a multi-role Learning Management System.
        </p>

        <div className="flex gap-4 items-center">
          {userId ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium h-10 px-5"
              >
                Go to Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium h-10 px-5"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium h-10 px-5"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
