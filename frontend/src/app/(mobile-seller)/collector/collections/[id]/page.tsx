import CollectorCollectionDetailPage from "@/features/mobile/collector/components/collections/CollectorCollectionDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectorCollectionDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <CollectorCollectionDetailPage collectionId={id} />;
}
