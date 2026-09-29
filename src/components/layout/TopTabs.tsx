"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "오늘 현황", href: "/operations/staff-schedule/today" },
  { label: "당직 일정", href: "/operations/staff-schedule/duty" },
  { label: "휴가·연차", href: "/operations/staff-schedule/leave" },
  { label: "출장·외출", href: "/operations/staff-schedule/trip" },
  { label: "승인 관리", href: "/operations/staff-schedule/approvals" },
  { label: "설정", href: "/operations/staff-schedule/settings" },
];

export default function TopTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto border-b border-gray-200 bg-white px-4 sm:px-6">
      <nav className="flex gap-6 whitespace-nowrap">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 px-1 py-3 text-sm ${
                isActive
                  ? "border-blue-600 font-medium text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
