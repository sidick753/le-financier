"use client";

import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Bienvenue, {user?.firstName} 👋
        </h1>
        <p className="mt-2 text-sm text-gray-500">Rôle : {user?.role}</p>
        <button
          onClick={logout}
          className="mt-4 rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
