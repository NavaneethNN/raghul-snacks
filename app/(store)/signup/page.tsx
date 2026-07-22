import { Suspense } from "react";
import { CustomerAuthForm } from "@/components/customer-auth-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <CustomerAuthForm mode="signup" />
    </Suspense>
  );
}
