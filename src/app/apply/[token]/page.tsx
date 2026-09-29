import ApplyRunner from "@/components/assessment/ApplyRunner";

export default async function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ApplyRunner token={token} />;
}
