"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "인재 DB 등록", href: "/recruiting/talent-db" },
  { label: "채용 대시보드", href: "/recruiting/dashboard" },
  { label: "입사자 온보딩", href: "/recruiting/onboarding" },
];

export default function RecruitTopTabs() {
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
