import React from "react";
import { useRouter } from "expo-router";
import CurrencyCalculatorModal from "@/components/CurrencyCalculatorModal";
import { useApp } from "@/lib/context/AppContext";

export default function CurrencyCalculatorModalScreen() {
  const router = useRouter();
  const { rates, ratesTimestamp } = useApp();

  return (
    <CurrencyCalculatorModal
      onClose={() => router.back()}
      rates={rates}
      ratesTimestamp={ratesTimestamp}
    />
  );
}
