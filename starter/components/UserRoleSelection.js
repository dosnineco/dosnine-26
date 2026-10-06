import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowRight, Building2, Home, KeyRound, Megaphone, Users } from 'lucide-react';
import { clearUserCache } from '../lib/useRoleProtection';

const accountOptions = [
  {
    accountType: 'regular',
    profileIntent: 'homeowner',
    title: 'Homeowner',
    description: 'List and manage up to two properties.',
    icon: Home,
    color: 'text-blue-700',
    background: 'bg-blue-50',
  },
  {
    accountType: 'regular',
    profileIntent: 'tenant',
    title: 'Tenant',
    description: 'Find a home and manage your property requests.',
    icon: KeyRound,
    color: 'text-emerald-700',
    background: 'bg-emerald-50',
  },
  {
    accountType: 'advertiser',
    title: 'Advertiser',
    description: 'Create and manage ad campaigns, payments, dates, and results.',
    icon: Megaphone,
    color: 'text-violet-700',
    background: 'bg-violet-50',
  },
  {
    accountType: 'agent',
    title: 'Real Estate Agent',
    description: 'Apply for agent access to listings, requests, and agent tools.',
    icon: Users,
    color: 'text-amber-700',
    background: 'bg-amber-50',
  },
];

export default function UserRoleSelection({ isAdmin = false }) {
  const { user } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const chooseAccount = async (option) => {
    if (saving) return;
    if (!user) {
      toast.error('Sign in to set up your account.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(
        '/api/user/account-type',
        {
          accountType: option.accountType,
          profileIntent: option.profileIntent,
        },
        { withCredentials: true }
      );
      clearUserCache(user.id);

      if (data?.user?.role === 'admin') {
        await router.replace(option.accountType === 'agent' ? '/agent/dashboard' : '/dashboard');
        return;
      }

      if (option.accountType === 'agent') {
        await router.replace('/agent/signup');
      } else {
        const verificationRole = option.profileIntent || option.accountType;
        await router.replace(`/verify?role=${verificationRole}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to save your account type.');
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-8 max-w-2xl text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-accent" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-gray-900">Choose your Dosnine account</h1>
          <p className="mt-3 text-gray-600">
            Choose the account that fits how you will use Dosnine. Your dashboard will be set up for this
            account type.
          </p>
          {isAdmin && (
            <Link href="/admin/dashboard" className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700">
              Open Admin Dashboard
            </Link>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {accountOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={`${option.accountType}-${option.profileIntent || 'default'}`}
                type="button"
                disabled={saving}
                onClick={() => chooseAccount(option)}
                className="flex min-h-52 flex-col rounded-2xl bg-white p-6 text-left transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-wait disabled:opacity-60"
              >
                <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${option.background} ${option.color}`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-lg font-semibold text-gray-900">{option.title}</span>
                <span className="mt-2 flex-1 text-sm text-gray-600">{option.description}</span>
                <span className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${option.color}`}>
                  {saving ? 'Saving account…' : 'Continue'}
                  {!saving && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Homeowner and Tenant accounts use the same basic dashboard. Admin access is an additional
          permission and does not replace your account type.
        </p>
      </div>
    </main>
  );
}
