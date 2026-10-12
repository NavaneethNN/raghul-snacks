import { Suspense } from "react";
import { CustomerAuthForm } from "@/components/customer-auth-form";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--line)", borderTopColor: "var(--terracotta)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <CustomerAuthForm mode="signup" />
    </Suspense>
  );
}
