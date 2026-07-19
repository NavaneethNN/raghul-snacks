import { OrderTracker } from "@/components/order-tracker";

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <section className="checkout-page"><OrderTracker initialOrder={order} /></section>;
}
