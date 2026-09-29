interface Props {
  todayOnLeaveCount: number;
  pendingCount: number;
  thisMonthUsedDays: number;
  totalRemainingDays: number;
}

export default function SummaryCards({
  todayOnLeaveCount,
  pendingCount,
  thisMonthUsedDays,
  totalRemainingDays,
}: Props) {
  const cards = [
    { label: "오늘 휴가", value: `${todayOnLeaveCount}명`, icon: "🌴", tone: "text-gray-900" },
    {
      label: "승인 대기",
      value: `${pendingCount}건`,
      icon: "⏳",
      tone: pendingCount > 0 ? "text-amber-600" : "text-gray-900",
    },
    { label: "이번달 사용 연차", value: `${thisMonthUsedDays}일`, icon: "📆", tone: "text-gray-900" },
    { label: "전체 잔여 연차", value: `${totalRemainingDays}일`, icon: "🧮", tone: "text-gray-900" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{card.label}</span>
            <span className="text-base">{card.icon}</span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
