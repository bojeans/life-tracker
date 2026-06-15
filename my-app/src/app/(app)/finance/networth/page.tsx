import { getNetWorthData } from "@/features/finance/networth-actions";
import { getExchangeRates } from "@/features/finance/currency-actions";
import { NetWorthView } from "@/features/finance/networth-view";

export default async function NetWorthPage() {
  const [data, rates] = await Promise.all([
    getNetWorthData(),
    getExchangeRates(),
  ]);

  return <NetWorthView initialData={data} rates={rates} />;
}
