export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      </header>
      <div className="p-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <p className="text-sm font-medium text-gray-700">Bientôt disponible</p>
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </>
  );
}
