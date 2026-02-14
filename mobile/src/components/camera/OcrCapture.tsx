import { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Camera, RotateCcw, Send, Zap, ZapOff } from "lucide-react-native";

interface OcrCaptureProps {
  onExtract: (imageBase64: string) => void;
  isExtracting: boolean;
  isActive: boolean;
}

export function OcrCapture({
  onExtract,
  isExtracting,
  isActive,
}: OcrCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission?.granted) {
    requestPermission();
    return null;
  }

  if (!isActive) return null;

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.8,
      // Resize to max 1024px for efficient upload
      imageType: "jpg",
    });

    if (photo) {
      setCapturedUri(photo.uri);
      setCapturedBase64(photo.base64 ?? null);
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setCapturedBase64(null);
  };

  const handleSend = () => {
    if (capturedBase64) {
      onExtract(capturedBase64);
    }
  };

  // Preview mode — show captured photo
  if (capturedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} />
        <View style={styles.previewOverlay}>
          <Text style={styles.previewLabel}>
            {isExtracting
              ? "Extracting text from image..."
              : "Photo captured. Extract text?"}
          </Text>
        </View>

        <View style={styles.previewActions}>
          <Pressable
            style={styles.retakeButton}
            onPress={handleRetake}
            disabled={isExtracting}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <RotateCcw size={20} color="#ffffff" />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>

          <Pressable
            style={[
              styles.extractButton,
              isExtracting && styles.extractButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={isExtracting}
            accessibilityLabel="Extract text from photo"
            accessibilityRole="button"
          >
            {isExtracting ? (
              <ActivityIndicator size="small" color="#1c1917" />
            ) : (
              <Send size={20} color="#1c1917" />
            )}
            <Text style={styles.extractText}>
              {isExtracting ? "Extracting..." : "Extract Text"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Camera mode
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
      />

      {/* Guide overlay */}
      <View style={styles.guideOverlay}>
        <View style={styles.guideBox}>
          <Text style={styles.guideText}>
            Position the product label within the frame
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
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

        <Pressable
          style={styles.captureButton}
          onPress={handleCapture}
          accessibilityLabel="Take photo"
          accessibilityRole="button"
        >
          <View style={styles.captureOuter}>
            <View style={styles.captureInner}>
              <Camera size={24} color="#1c1917" />
            </View>
          </View>
        </Pressable>

        {/* Spacer for centering */}
        <View style={{ width: 48 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  guideBox: {
    width: "85%",
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.6)",
    borderRadius: 12,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  guideText: {
    fontSize: 13,
    fontFamily: "IBMPlexSans_500Medium",
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 24,
  },
  torchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  previewOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_500Medium",
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  previewActions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
  },
  retakeText: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_500Medium",
    color: "#ffffff",
  },
  extractButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#f59e0b",
    borderRadius: 12,
  },
  extractButtonDisabled: {
    opacity: 0.7,
  },
  extractText: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_600SemiBold",
    color: "#1c1917",
  },
});
