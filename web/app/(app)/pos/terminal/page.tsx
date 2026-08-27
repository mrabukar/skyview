"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PosTerminal } from "../components/pos-terminal";
import { useAppStore } from "@/store/app";

/**
 * /pos/terminal — live till for branch managers and admins.
 *
 * Cashiers already land on the terminal at /pos.
 */
export default function PosTerminalPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    if (user.role === "cashier") {
      router.replace("/pos");
      return;
    }
    if (user.role !== "manager" && user.role !== "admin") {
      router.replace("/pos");
    }
  }, [user, router]);

  if (!user || (user.role !== "manager" && user.role !== "admin")) return null;

  return <PosTerminal />;
}
