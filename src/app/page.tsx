'use client';

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Receipt, Split, Wallet, CheckCircle2 } from "lucide-react";

export default function Home() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Split size={20} />
            </div>
            CostShare
          </Link>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Profile
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="hidden sm:block text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-32 pb-16">

        {/* Hero Section */}
        <section className="container mx-auto px-6 mb-24 lg:mb-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                The easiest way to split expenses
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                Split costs effortlessly with friends & family.
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Scan receipts, split bills, and track balances in real-time.
                Whether it's a roomate, a trip, or a dinner, we make sure everyone pays their fair share.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  Start Splitting Free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="#features"
                  className="w-full sm:w-auto px-8 py-3.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Learn more
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
              <div className="absolute top-0 right-0 -z-10 w-full h-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl rounded-full transform translate-x-12 -translate-y-12"></div>
              <Image
                src="/hero-illustration.png"
                alt="Cost Splitting Illustration"
                width={800}
                height={600}
                priority
                className="w-full h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-6 py-24 border-t border-zinc-100 dark:border-zinc-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to manage shared expenses</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Powerful features to help you track, split, and settle up without the awkward conversations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                <Receipt size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Receipt Scanning</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Upload a photo of your receipt and let our AI automatically itemize and assign costs to the right people.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                <Split size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Flexible Splitting</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Split by percentage, exact amounts, or shares. Handle complex bills with multiple people easily.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-teal-200 dark:hover:border-teal-900/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-6">
                <Wallet size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Balances</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Know exactly who owes what at any moment. Settle up debts with integrated payment recording.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="bg-zinc-900 dark:bg-zinc-800 rounded-3xl p-12 text-center text-white relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to get started?</h2>
              <p className="text-zinc-400 mb-8 text-lg">
                Join thousands of users who are already saving time and avoiding arguments by using CostShare.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-900 rounded-full font-bold hover:bg-zinc-100 transition-colors"
              >
                Create Free Account
                <ArrowRight size={20} />
              </Link>
            </div>

            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
        <div className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-6 h-6 rounded bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900">
              <Split size={14} />
            </div>
            CostShare
          </div>
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} CostShare App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
