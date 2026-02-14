import { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScanBarcode, Type, Sparkles, Camera } from "lucide-react-native";

import { BarcodeScanner } from "@/components/camera/BarcodeScanner";
import { ScanResult } from "@/components/camera/ScanResult";
import { OcrCapture } from "@/components/camera/OcrCapture";
import { OcrResult } from "@/components/camera/OcrResult";
import { ProductRecognition } from "@/components/camera/ProductRecognition";
import { API_URL } from "@/lib/config";

type CameraMode = "barcode" | "ocr" | "recognize";

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CameraMode>("barcode");

  // Barcode state
  const [scanResult, setScanResult] = useState<{
    barcode: string;
    type: string;
  } | null>(null);
  const [product, setProduct] = useState<{
    articleNumber: string;
    name: string;
    imageUrl?: string;
    hasGuide: boolean;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // OCR state
  const [ocrResult, setOcrResult] = useState<{
    articleNumbers: string[];
    rawText: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleBarcodeScan = useCallback(
    async (data: string, type: string) => {
      setScanResult({ barcode: data, type });
      setIsSearching(true);
      setProduct(null);

      try {
        // Search by barcode/article number
        const res = await fetch(
          `${API_URL}/api/search?q=${encodeURIComponent(data)}&limit=1`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.products?.length > 0) {
            const p = json.products[0];
            setProduct({
              articleNumber: p.article_number,
              name: p.product_name ?? "Unknown Product",
              imageUrl: p.images?.[0]?.url,
              hasGuide: p.guide_status === "published",
            });
          }
        }
      } catch {
        // Network error — product stays null (not found)
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleOcrExtract = useCallback(async (base64: string) => {
    setIsExtracting(true);
    setOcrResult(null);

    try {
      const res = await fetch(`${API_URL}/api/ocr/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (res.ok) {
        const data = await res.json();
        setOcrResult(data);
      }
    } catch {
      setOcrResult({ articleNumbers: [], rawText: "" });
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const switchMode = (newMode: CameraMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setScanResult(null);
    setOcrResult(null);
    setProduct(null);
  };

  // Permission request screen
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Camera size={64} color="#f59e0b" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Guid needs camera access to scan barcodes and read product labels.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={requestPermission}
          accessibilityLabel="Grant camera permission"
          accessibilityRole="button"
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera views */}
      <BarcodeScanner
        onScan={handleBarcodeScan}
        isActive={mode === "barcode"}
      />
      <OcrCapture
        onExtract={handleOcrExtract}
        isExtracting={isExtracting}
        isActive={mode === "ocr"}
      />
      <ProductRecognition isActive={mode === "recognize"} />

      {/* Mode switcher */}
      <View style={styles.modeSwitcher}>
        <ModeButton
          icon={<ScanBarcode size={18} color={mode === "barcode" ? "#1c1917" : "#ffffff"} />}
          label="Scan"
          isActive={mode === "barcode"}
          onPress={() => switchMode("barcode")}
        />
        <ModeButton
          icon={<Type size={18} color={mode === "ocr" ? "#1c1917" : "#ffffff"} />}
          label="Read Label"
          isActive={mode === "ocr"}
          onPress={() => switchMode("ocr")}
        />
        <ModeButton
          icon={<Sparkles size={18} color={mode === "recognize" ? "#1c1917" : "#ffffff"} />}
          label="Identify"
          isActive={mode === "recognize"}
          onPress={() => switchMode("recognize")}
          disabled
        />
      </View>

      {/* Barcode scan result */}
      {scanResult && mode === "barcode" && (
        <ScanResult
          barcode={scanResult.barcode}
          barcodeType={scanResult.type}
          product={product}
          isLoading={isSearching}
          onViewProduct={(articleNumber) =>
            router.push(`/products/${articleNumber}`)
          }
          onSearchManually={() => {
            setScanResult(null);
            router.push("/(tabs)/search");
          }}
          onDismiss={() => setScanResult(null)}
        />
      )}

      {/* OCR result */}
      {ocrResult && mode === "ocr" && (
        <OcrResult
          articleNumbers={ocrResult.articleNumbers}
          rawText={ocrResult.rawText}
          onSelectArticle={(articleNumber) =>
            router.push(`/products/${articleNumber}`)
          }
          onSearchText={() => router.push("/(tabs)/search")}
          onDismiss={() => setOcrResult(null)}
        />
      )}
    </View>
  );
}

function ModeButton({
  icon,
  label,
  isActive,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.modeButton,
        isActive && styles.modeButtonActive,
        disabled && styles.modeButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`Switch to ${label} mode`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive, disabled }}
    >
      {icon}
      <Text
        style={[
          styles.modeLabel,
          isActive && styles.modeLabelActive,
          disabled && styles.modeLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
    backgroundColor: "#1c1917",
  },
  permissionTitle: {
    fontSize: 22,
    fontFamily: "IBMPlexSans_600SemiBold",
    color: "#fafaf9",
    marginTop: 8,
  },
  permissionText: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_400Regular",
    color: "#a8a29e",
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
    color: "#1c1917",
  },
  modeSwitcher: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modeButtonActive: {
    backgroundColor: "#f59e0b",
  },
  modeButtonDisabled: {
    opacity: 0.5,
  },
  modeLabel: {
    fontSize: 13,
    fontFamily: "IBMPlexSans_500Medium",
    color: "#ffffff",
  },
  modeLabelActive: {
    color: "#1c1917",
  },
  modeLabelDisabled: {
    color: "#a8a29e",
  },
});
