import { OrderTracker } from "@/components/order-tracker";

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string; phone?: string }> }) {
  const { order, phone } = await searchParams;
  return <section className="checkout-page"><OrderTracker initialOrder={order} initialPhone={phone} /></section>;
}
