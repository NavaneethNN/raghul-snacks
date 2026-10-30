import { redirect } from "next/navigation";

export default function AdminCombosPage() {
  redirect("/admin/products?category=combos");
}
