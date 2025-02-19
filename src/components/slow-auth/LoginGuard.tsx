import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai";
import React, { useEffect } from "react";
import { authAtom } from "./client";

interface LoginGuardProps {
  children: React.ReactNode;
}

export function LoginGuard({ children }: LoginGuardProps) {
  const [auth] = useAtom(authAtom);
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    // Skip redirect if we're already on the login page
    if (!auth.isAuthenticated && location.pathname !== "/login") {
      // Only use pathname and original search params for redirect
      const currentPath = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      // Remove the redirect param if it exists to prevent loops
      searchParams.delete("redirect");
      const searchString = searchParams.toString();
      const redirectUrl = encodeURIComponent(
        `${currentPath}${searchString ? `?${searchString}` : ""}`
      );
      navigate({ to: "/login", search: { redirect: redirectUrl } });
    }
  }, [auth.isAuthenticated, navigate, location.pathname, location.search]);

  if (!auth.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
