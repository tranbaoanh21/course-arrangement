import { CalendarRange } from 'lucide-react';

export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-[#1557b0] text-white">
        <CalendarRange size={20} strokeWidth={2.2} />
      </span>
      {!compact && <span className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">Lịch Gọn</span>}
    </div>
  );
}
