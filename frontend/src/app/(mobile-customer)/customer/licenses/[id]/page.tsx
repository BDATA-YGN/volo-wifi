import CustomerLicenseDetailPage from "@/features/mobile/customer/components/licenses/CustomerLicenseDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CustomerLicenseDetailPage licenseId={id} />;
}
