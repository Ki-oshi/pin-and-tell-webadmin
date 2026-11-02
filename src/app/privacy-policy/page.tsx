import type { Metadata } from "next";

import LegalPolicyPage from "@/components/public/legal-policy-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | PIN & TELL",
  description: "Read the current PIN & TELL Privacy Policy.",
  icons: {
    icon: "/images/pin-tell-logo.png",
    apple: "/images/pin-tell-logo.png",
  },
};

export default function PrivacyPolicyPage() {
  return <LegalPolicyPage policyKey="privacy_policy" />;
}
