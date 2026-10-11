import { Suspense } from "react";
import { CustomerOrders } from "@/components/customer-orders";

export default function OrdersPage() {
  return (
    <Suspense>
      <CustomerOrders />
    </Suspense>
  );
}
