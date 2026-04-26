import { STATUS_ORDER } from "@/lib/domain/lead-enums";
import type { FunnelData } from "@/lib/queries/funnel";
import { FunnelColumn } from "./funnel-column";

export function FunnelBoard({ data }: { data: FunnelData }) {
  return (
    <div className="flex flex-col gap-2 p-4 md:flex-row md:gap-3 md:overflow-x-auto md:p-6">
      {STATUS_ORDER.map((status) => (
        <FunnelColumn key={status} status={status} leads={data[status]} />
      ))}
    </div>
  );
}
