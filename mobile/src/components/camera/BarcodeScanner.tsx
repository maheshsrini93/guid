import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { Zap, ZapOff } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.7;

interface BarcodeScannerProps {
  onScan: (data: string, type: string) => void;
  isActive: boolean;
}

export function BarcodeScanner({ onScan, isActive }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    // Reset scanned state when becoming active
    if (isActive) {
      setScanned(false);
    }
  }, [isActive]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (cooldownRef.current || scanned) return;

    cooldownRef.current = true;
    setScanned(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScan(result.data, result.type);

    // Cooldown to prevent rapid double-scans
    setTimeout(() => {
      cooldownRef.current = false;
    }, 2000);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (!permission.granted) {
    return null; // Parent handles permission UI
  }

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "qr",
            "code128",
            "code39",
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.viewfinder}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {/* Scanning line animation placeholder */}
            {!scanned && <View style={styles.scanLine} />}
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Flash toggle */}
      <Pressable
        style={styles.torchButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTorch((t) => !t);
        }}
        accessibilityLabel={torch ? "Turn off flash" : "Turn on flash"}
        accessibilityRole="button"
      >
        {torch ? (
          <Zap size={24} color="#f59e0b" fill="#f59e0b" />
        ) : (
          <ZapOff size={24} color="#ffffff" />
        )}
      </Pressable>

      {/* Scan again button */}
      {scanned && (
        <Pressable
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
          accessibilityLabel="Scan again"
          accessibilityRole="button"
        >
          <View style={styles.rescanInner}>
            <ActivityIndicator size="small" color="#1c1917" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const OVERLAY_COLOR = "rgba(0,0,0,0.6)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    flexDirection: "row",
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: "relative",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#f59e0b",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: "#f59e0b",
    opacity: 0.8,
    borderRadius: 1,
  },
  torchButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  rescanButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
  rescanInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#f59e0b",
    borderRadius: 24,
  },
});
