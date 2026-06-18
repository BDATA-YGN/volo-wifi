import CollectorExpenseDetailPage from "@/features/mobile/collector/components/expenses/CollectorExpenseDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectorExpenseDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <CollectorExpenseDetailPage claimId={id} />;
}
