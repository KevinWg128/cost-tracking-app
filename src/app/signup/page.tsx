'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { createUserProfile } from '../../lib/userProfile';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { Mail } from 'lucide-react';

interface PasswordRequirement {
    label: string;
    test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /\d/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function SignUpContent() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Pre-fill email and track invitation token from URL
    const invitationToken = searchParams.get('invitation');
    const prefilledEmail = searchParams.get('email');

    useEffect(() => {
        if (prefilledEmail) {
            setEmail(prefilledEmail);
        }
    }, [prefilledEmail]);

    const passwordValidation = useMemo(() => {
        return passwordRequirements.map((req) => ({
            ...req,
            met: req.test(password),
        }));
    }, [password]);

    const isPasswordValid = useMemo(() => {
        return passwordValidation.every((req) => req.met);
    }, [passwordValidation]);

    const linkPendingInvitationsToUser = async (userId: string, userEmail: string) => {
        try {
            // Call the API to link pending invitations
            const response = await fetch('/api/invitations/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, email: userEmail }),
            });

            if (!response.ok) {
                console.warn('Failed to link pending invitations');
            }
        } catch (err) {
            console.error('Error linking invitations:', err);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!firstName.trim()) {
            setError('First name is required');
            setLoading(false);
            return;
        }

        if (!isPasswordValid) {
            setError('Please ensure your password meets all requirements');
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('User signed up successfully:', userCredential.user);

            // Create user profile in Firestore
            await createUserProfile(userCredential.user.uid, {
                email: userCredential.user.email || email,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });

            // Link any pending invitations to this user
            await linkPendingInvitationsToUser(
                userCredential.user.uid,
                userCredential.user.email || email
            );

            // If there's an invitation token, redirect to accept it
            if (invitationToken) {
                router.push(`/invitations/accept?token=${invitationToken}`);
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error('Error signing up:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-md w-full p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Create Account
                    </h2>
                    <p className="mt-2 text-gray-400">Join us to start tracking your costs</p>
                </div>

                {/* Invitation banner */}
                {invitationToken && (
                    <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded-xl flex items-center gap-3">
                        <Mail className="text-blue-400 shrink-0" size={24} />
                        <div>
                            <p className="text-blue-200 text-sm font-medium">You&apos;ve been invited!</p>
                            <p className="text-blue-300/70 text-xs">Complete signup to join the group automatically.</p>
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                                    First Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    autoComplete="given-name"
                                    required
                                    className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 outline-none placeholder-gray-500"
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                                    Last Name
                                </label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    autoComplete="family-name"
                                    className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 outline-none placeholder-gray-500"
                                    placeholder="Doe"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>
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
                                className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 outline-none placeholder-gray-500"
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
                                autoComplete="new-password"
                                required
                                className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 outline-none placeholder-gray-500"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {password.length > 0 && (
                                <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <p className="text-xs font-medium text-gray-400 mb-2">Password Requirements:</p>
                                    <ul className="space-y-1">
                                        {passwordValidation.map((req, index) => (
                                            <li key={index} className="flex items-center text-xs">
                                                {req.met ? (
                                                    <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                <span className={req.met ? 'text-green-400' : 'text-gray-500'}>{req.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition duration-300 font-bold rounded-xl shadow-lg transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group text-white"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Account...
                            </span>
                        ) : (
                            invitationToken ? 'Sign Up & Join Group' : 'Sign Up'
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

                    <GoogleSignInButton text="Sign up with Google" />
                </form>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link href="/signin" className="font-semibold text-blue-400 hover:text-blue-300 transition duration-200">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function SignUp() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        }>
            <SignUpContent />
        </Suspense>
    );
}
