export type CameraPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface CameraAccessResult {
  ok: boolean;
  state: CameraPermissionState;
  message?: string;
}

function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

export async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }

  if (!isSecureContext()) {
    return "unsupported";
  }

  try {
    const permissions = navigator.permissions;
    if (!permissions?.query) return "prompt";
    const status = await permissions.query({ name: "camera" as PermissionName });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
    return "prompt";
  } catch {
    return "prompt";
  }
}

/** Warm up camera permission (must be called from a user gesture on iOS / installed PWAs). */
export async function requestCameraAccess(): Promise<CameraAccessResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      state: "unsupported",
      message: "Camera is not supported in this browser.",
    };
  }

  if (!isSecureContext()) {
    return {
      ok: false,
      state: "unsupported",
      message: "Camera requires HTTPS. Open the app over a secure connection.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());

    const state = await queryCameraPermission();
    return { ok: true, state: state === "unsupported" ? "granted" : state };
  } catch (error) {
    const state = await queryCameraPermission();
    const name = error instanceof DOMException ? error.name : "";

    if (name === "NotAllowedError" || state === "denied") {
      return {
        ok: false,
        state: "denied",
        message:
          "Camera access was blocked. Allow camera for this site in browser settings, then tap Try again.",
      };
    }

    if (name === "NotFoundError") {
      return {
        ok: false,
        state: "unsupported",
        message: "No camera was found on this device.",
      };
    }

    return {
      ok: false,
      state,
      message: "Could not open the camera. Use manual code entry below or try again.",
    };
  }
}

export function cameraPermissionInstructions(): string {
  const isIos =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream;

  if (isIos) {
    return "On iPhone: Settings → Safari → Camera → Allow, or reinstall the home-screen app after allowing camera.";
  }

  return "Allow camera when prompted. If blocked, use the site permission icon in the address bar.";
}
