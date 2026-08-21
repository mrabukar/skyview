// TOPPINGS HIDDEN — redirect to menu items until toppings are re-enabled.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ToppingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/menu/items");
  }, [router]);
  return null;
}
