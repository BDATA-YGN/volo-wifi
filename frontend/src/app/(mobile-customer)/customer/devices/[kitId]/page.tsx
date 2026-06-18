import MobileScreen from "@/features/mobile/shared/components/MobileScreen";

interface Props {
  params: Promise<{ kitId: string }>;
}

export default async function CustomerDevicePage({ params }: Props) {
  const { kitId } = await params;
  return (
    <MobileScreen
      title="Device & Location"
      description={`Device detail and map pin for kit ${kitId}.`}
    />
  );
}
