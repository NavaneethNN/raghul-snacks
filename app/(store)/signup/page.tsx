import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { CustomerAuthForm } from "@/components/customer-auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(customerCookieName());
  const session = sessionCookie?.value ? getCustomerSession(sessionCookie.value) : null;

  const params = await searchParams;
  const returnTo = params?.returnTo || "/account";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.includes("://") ? returnTo : "/account";

  // If already logged in, redirect directly to return destination or account
  if (session?.id) {
    redirect(safeReturnTo);
  }

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--line)",
              borderTopColor: "var(--terracotta)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      }
    >
      <CustomerAuthForm mode="signup" />
    </Suspense>
  );
}
