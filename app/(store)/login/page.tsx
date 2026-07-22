import { Suspense } from "react";
import { CustomerAuthForm } from "@/components/customer-auth-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <CustomerAuthForm mode="login" />
    </Suspense>
  );
}
