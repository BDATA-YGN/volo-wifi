import CustomerContentDetailPage from "@/features/mobile/customer/components/content/CustomerContentDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CustomerContentDetailPage contentId={id} />;
}
