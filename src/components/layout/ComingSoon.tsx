import Link from "next/link";

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white py-24 text-center">
      <p className="text-4xl">🚧</p>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="max-w-sm text-sm text-gray-500">{description}</p>
      <Link
        href="/operations/staff-schedule/leave"
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        휴가·연차 관리로 이동
      </Link>
    </div>
  );
}
