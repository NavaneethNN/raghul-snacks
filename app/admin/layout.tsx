import { AdminSidebar } from "@/components/admin-sidebar";
import styles from "./admin-layout.module.css";
import { headers } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";
  const isLoginPage = pathname === "/admin/login" || pathname.startsWith("/admin/login");

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
