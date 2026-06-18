import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";

export default function CollectorNotFound() {
  return (
    <MobileGeneralError
      actor="collector"
      title="Page not found"
      message="This collector page does not exist. Go back to home to continue."
    />
  );
}
