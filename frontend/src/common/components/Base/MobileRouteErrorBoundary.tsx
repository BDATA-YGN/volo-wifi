"use client";

import React from "react";
import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";
import MobileThemeProvider from "@/features/mobile/shared/components/MobileThemeProvider";
import type { MobileActorType } from "@/features/mobile/shared/types";

interface MobileRouteErrorBoundaryProps {
  actor: MobileActorType;
  children: React.ReactNode;
}

interface MobileRouteErrorBoundaryState {
  hasError: boolean;
}

export default class MobileRouteErrorBoundary extends React.Component<
  MobileRouteErrorBoundaryProps,
  MobileRouteErrorBoundaryState
> {
  state: MobileRouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MobileRouteErrorBoundaryState {
    return { hasError: true };
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <MobileThemeProvider>
          <MobileGeneralError
            actor={this.props.actor}
            onRetry={this.handleRetry}
            standalone
          />
        </MobileThemeProvider>
      );
    }
    return this.props.children;
  }
}
