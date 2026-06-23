import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo_court.png"
        alt="LeFinancier"
        width={40}
        height={40}
        className="rounded-lg"
      />
      <div className="flex flex-col gap-px">
        <span className="text-[15px] font-extrabold leading-tight tracking-tight text-slate-900">
          LeFinancier
        </span>
        <span className="text-[10px] font-medium leading-tight text-slate-500">
          Marketplace de financement
        </span>
      </div>
    </div>
  );
}
