import CollectorSupportDetailPage from "@/features/mobile/collector/components/support/CollectorSupportDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CollectorSupportDetailPage ticketId={id} />;
}
