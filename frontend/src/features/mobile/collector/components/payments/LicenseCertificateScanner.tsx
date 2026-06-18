"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Drawer, Input } from "antd";
import { Html5Qrcode } from "html5-qrcode";
import {
  MobileDrawerBody,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import {
  cameraPermissionInstructions,
  queryCameraPermission,
  requestCameraAccess,
  type CameraPermissionState,
} from "@/features/mobile/shared/pwa/cameraPermission";
import pwaStyles from "@/features/mobile/shared/components/mobilePwa.module.css";
import styles from "./payments.module.css";

const SCANNER_REGION_ID = "license-certificate-qr-reader";

interface LicenseCertificateScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (raw: string) => void;
}

export default function LicenseCertificateScanner({
  open,
  onClose,
  onScan,
}: LicenseCertificateScannerProps) {
  const { message } = App.useApp();
  const { colorScheme } = useMobileDrawerChrome("collector");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [manualToken, setManualToken] = useState("");
  const [cameraState, setCameraState] = useState<CameraPermissionState>("prompt");
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScannerActive(false);
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // ignore cleanup errors
    }
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();
    setStartingCamera(true);
    setCameraMessage(null);

    try {
      const scanner = new Html5Qrcode(SCANNER_REGION_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          onScanRef.current(decoded);
          onCloseRef.current();
        },
        () => {},
      );
      setScannerActive(true);
      setCameraState("granted");
    } catch {
      const state = await queryCameraPermission();
      setCameraState(state);
      setCameraMessage(
        "Could not start the camera. Allow camera access, then tap Try again, or paste the code below.",
      );
    } finally {
      setStartingCamera(false);
    }
  }, [stopScanner]);

  const handleEnableCamera = useCallback(async () => {
    setRequestingPermission(true);
    setCameraMessage(null);
    const result = await requestCameraAccess();
    setRequestingPermission(false);

    if (!result.ok) {
      setCameraState(result.state);
      setCameraMessage(result.message ?? "Camera permission is required for QR scan.");
      return;
    }

    setCameraState("granted");
    await startScanner();
  }, [startScanner]);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setManualToken("");
      setCameraMessage(null);
      setCameraState("prompt");
      return;
    }

    let cancelled = false;

    const prepare = async () => {
      const state = await queryCameraPermission();
      if (cancelled) return;
      setCameraState(state);
      if (state === "granted") {
        await startScanner();
      }
    };

    void prepare();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const submitManual = () => {
    const trimmed = manualToken.trim();
    if (!trimmed) {
      message.warning("Paste the certificate QR code or verification link");
      return;
    }
    onScan(trimmed);
    onClose();
  };

  const showPermissionGate = !scannerActive && cameraState !== "granted";

  return (
    <Drawer
      title="Scan certificate QR"
      placement="bottom"
      size="auto"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={mobileDrawerStyleProps(colorScheme, {
        body: {
          maxHeight: "85vh",
          overflowY: "auto",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0))",
        },
      })}
    >
      <MobileDrawerBody actor="collector">
        <p className={styles.drawerHint}>
          Point your camera at the QR code printed on the ULA license certificate.
        </p>

        {showPermissionGate ? (
          <div className={pwaStyles.cameraPermissionBlock}>
            <p className={pwaStyles.cameraPermissionTitle}>Camera access needed</p>
            <p className={pwaStyles.cameraPermissionText}>
              {cameraMessage ??
                "We use your camera only to scan license certificate QR codes. Tap the button below — your browser will ask for permission."}
            </p>
            <p className={pwaStyles.cameraPermissionText}>{cameraPermissionInstructions()}</p>
            <button
              type="button"
              className={pwaStyles.cameraPermissionBtn}
              disabled={requestingPermission || startingCamera}
              onClick={() => void handleEnableCamera()}
            >
              {requestingPermission ? "Requesting permission…" : "Enable camera"}
            </button>
            {cameraState === "denied" ? (
              <button
                type="button"
                className={`${pwaStyles.cameraPermissionBtn} ${pwaStyles.cameraPermissionBtnSecondary}`}
                disabled={requestingPermission || startingCamera}
                onClick={() => void handleEnableCamera()}
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div id={SCANNER_REGION_ID} className={styles.qrViewport} />
            {startingCamera ? <p className={styles.scannerStatus}>Starting camera…</p> : null}
          </>
        )}

        <div className={styles.manualTokenBlock}>
          <div className={styles.manualTokenLabel}>Or paste code / link</div>
          <Input.TextArea
            rows={3}
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="v1.xxx… or /verify/license?t=…"
          />
          <Button
            type="primary"
            block
            size="large"
            onClick={submitManual}
            style={{ marginTop: "0.75rem" }}
          >
            Use pasted code
          </Button>
        </div>
      </MobileDrawerBody>
    </Drawer>
  );
}
