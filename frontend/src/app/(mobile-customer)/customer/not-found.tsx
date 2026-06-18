import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";

export default function CustomerNotFound() {
  return (
    <MobileGeneralError
      actor="customer"
      title="Page not found"
      message="This customer page does not exist. Go back to home to continue."
    />
  );
}
