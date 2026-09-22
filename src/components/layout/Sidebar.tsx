"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href?: string;
  icon: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "오늘일과", href: "#", icon: "📅" },
      { label: "운영 일정", href: "/operations/staff-schedule", icon: "🗓️" },
      { label: "내 통지내역", href: "#", icon: "🔔" },
    ],
  },
  {
    title: "채용",
    items: [
      { label: "인재 DB 등록", href: "/recruiting/talent-db", icon: "🗂️" },
      { label: "채용 대시보드", href: "/recruiting/dashboard", icon: "📊" },
      { label: "입사자 온보딩", href: "/recruiting/onboarding", icon: "🧾" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-base font-bold text-gray-900">박기표_HR프로젝트</p>
        <p className="text-xs text-gray-400">HR 관리 시스템</p>
      </div>

      <div className="px-3 py-3">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-400">
          <span>검색</span>
          <span className="ml-auto text-xs">⌘K</span>
        </div>
      </div>

      <nav className="flex-1 px-2 pb-6 text-sm">
        {navGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.title && (
              <p className="px-2 pb-1 text-xs font-medium text-gray-400">{group.title}</p>
            )}
            <ul>
              {group.items.map((item) => {
                const isActive =
                  item.href && item.href !== "#" && pathname?.startsWith(item.href);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href ?? "#"}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
