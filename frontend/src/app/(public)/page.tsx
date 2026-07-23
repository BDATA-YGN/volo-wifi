import type { Metadata } from "next";
import WelcomePage from "@/features/welcome/WelcomePage";

export const metadata: Metadata = {
  title: "Welcome to Volo",
  description: "Volo WiFi — reliable connectivity for every site.",
};

export default function PublicWelcomeRoute() {
  return <WelcomePage />;
}
