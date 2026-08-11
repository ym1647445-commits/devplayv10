"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export interface UserProfile {
  id: string;
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;

  role:
    | "customer"
    | "support"
    | "admin"
    | "super_admin"
    | "owner";

  status:
    | "active"
    | "restricted"
    | "suspended"
    | "banned";

  points: number;
  customer_level: string;
  trust_score: number;
  onboarding_completed: boolean;
}

export interface UserWallet {
  id: string;
  user_id: string;

  balance_usd: number;
  balance_egp: number;

  frozen_balance_usd: number;
  frozen_balance_egp: number;

  usd_to_egp_rate: number;

  is_frozen: boolean;
  freeze_reason: string | null;
}

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  wallet: UserWallet | null;

  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [wallet, setWallet] =
    useState<UserWallet | null>(null);

  const refreshAuth =
    useCallback(async (): Promise<void> => {
      setLoading(true);

      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          setUser(null);
          setProfile(null);
          setWallet(null);
          return;
        }

        setUser(currentUser);

        const [
          {
            data: profileData,
            error: profileError,
          },
          {
            data: walletData,
            error: walletError,
          },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              customer_id,
              full_name,
              email,
              phone,
              avatar_url,
              role,
              status,
              points,
              customer_level,
              trust_score,
              onboarding_completed
            `)
            .eq("id", currentUser.id)
            .maybeSingle<UserProfile>(),

          supabase
            .from("account_wallet_balances")
            .select(`
              id,
              user_id,
              balance_usd,
              balance_egp,
              frozen_balance_usd,
              frozen_balance_egp,
              usd_to_egp_rate,
              is_frozen,
              freeze_reason
            `)
            .eq("user_id", currentUser.id)
            .maybeSingle<UserWallet>(),
        ]);

        if (profileError) {
          console.error(
            "Failed to load profile:",
            profileError,
          );
        }

        if (walletError) {
          console.error(
            "Failed to load wallet:",
            walletError,
          );
        }

        setProfile(
          profileError
            ? null
            : profileData ?? null,
        );

        setWallet(
          !walletError && walletData
            ? {
                ...walletData,

                balance_usd: Number(
                  walletData.balance_usd,
                ),

                balance_egp: Number(
                  walletData.balance_egp,
                ),

                frozen_balance_usd: Number(
                  walletData.frozen_balance_usd,
                ),

                frozen_balance_egp: Number(
                  walletData.frozen_balance_egp,
                ),

                usd_to_egp_rate: Number(
                  walletData.usd_to_egp_rate,
                ),
              }
            : null,
        );
      } catch (error) {
        console.error(
          "Failed to load authentication data:",
          error,
        );

        setUser(null);
        setProfile(null);
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }, [supabase]);

  const signOut =
    useCallback(async (): Promise<void> => {
      setLoading(true);

      try {
        await supabase.auth.signOut();
      } finally {
        setUser(null);
        setProfile(null);
        setWallet(null);
        setLoading(false);

        window.location.href = "/";
      }
    }, [supabase]);

  useEffect(() => {
    void refreshAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void refreshAuth();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      profile,
      wallet,
      refreshAuth,
      signOut,
    }),
    [
      loading,
      user,
      profile,
      wallet,
      refreshAuth,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}