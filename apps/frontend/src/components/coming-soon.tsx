export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
        <p className="text-sm font-medium text-gray-700">Bientôt disponible</p>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}
