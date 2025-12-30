'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleSignInButton from '../../components/GoogleSignInButton';


export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
    const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);
    const router = useRouter();

    // Countdown timer for lockout
    useEffect(() => {
        if (lockoutRemaining === null || lockoutRemaining <= 0) return;

        const timer = setInterval(() => {
            setLockoutRemaining(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [lockoutRemaining]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        // Don't allow submission during lockout
        if (lockoutRemaining && lockoutRemaining > 0) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle rate limiting
                if (response.status === 429) {
                    setLockoutRemaining(data.lockoutRemaining);
                    setRemainingAttempts(0);
                    setError(data.error);
                } else {
                    setError(data.error || 'Sign in failed');
                    if (data.remainingAttempts !== undefined) {
                        setRemainingAttempts(data.remainingAttempts);
                    }
                }
                return;
            }

            // Successfully authenticated via API, now sign in to Firebase client
            // to maintain auth state in the app
            await signInWithEmailAndPassword(auth, email, password);
            console.log('User signed in successfully');
            router.push('/');
        } catch (err: any) {
            console.error('Error signing in:', err.message);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isLockedOut = lockoutRemaining !== null && lockoutRemaining > 0;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-md w-full p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-gray-400">Sign in to manage your costs</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                disabled={isLockedOut}
                                className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 outline-none placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                disabled={isLockedOut}
                                className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200 outline-none placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-sm text-emerald-400 hover:text-emerald-300 transition duration-200">
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    {/* Lockout Warning */}
                    {isLockedOut && (
                        <div className="p-4 bg-orange-900/30 border border-orange-500/50 rounded-xl text-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="font-semibold">Account Temporarily Locked</span>
                            </div>
                            <p className="text-sm">
                                Too many failed login attempts. Try again in{' '}
                                <span className="font-mono font-bold text-orange-100">
                                    {formatTime(lockoutRemaining)}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Remaining Attempts Warning */}
                    {!isLockedOut && remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && (
                        <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-xl text-yellow-200 text-sm">
                            <span className="font-semibold">Warning:</span> {remainingAttempts} login attempt{remainingAttempts !== 1 ? 's' : ''} remaining before lockout
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !isLockedOut && (
                        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || isLockedOut}
                        className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition duration-300 font-bold rounded-xl shadow-lg transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group text-white"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing In...
                            </span>
                        ) : isLockedOut ? (
                            `Locked (${formatTime(lockoutRemaining)})`
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <GoogleSignInButton text="Sign in with Google" />
                </form>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300 transition duration-200">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}

