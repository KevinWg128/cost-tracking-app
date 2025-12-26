'use client';

import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Home() {
  const { currentUser, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex w-full justify-between items-center mb-12">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          {currentUser && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {currentUser.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {currentUser ? `Welcome back, ${currentUser.email?.split('@')[0]}!` : "To get started, edit the page.tsx file."}
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {currentUser
              ? "You are now logged in and can start tracking your costs."
              : "Looking for a starting point or more instructions? Head over to Templates or the Learning center."}
          </p>
        </div>

        {!currentUser && (
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-8">
            <a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 text-white transition-colors hover:bg-blue-700 md:w-auto"
              href="/signup"
            >
              Get Started
            </a>
            <a
              className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-8 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-auto dark:text-white"
              href="/signin"
            >
              Sign In
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
