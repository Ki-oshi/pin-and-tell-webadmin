import type { Metadata } from "next";

import LegalPolicyPage from "@/components/public/legal-policy-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms & Conditions | PIN & TELL",
  description: "Read the current PIN & TELL Terms & Conditions.",
  icons: {
    icon: "/images/pin-tell-logo.png",
    apple: "/images/pin-tell-logo.png",
  },
};

export default function TermsAndConditionsPage() {
  return <LegalPolicyPage policyKey="terms_and_conditions" />;
}
