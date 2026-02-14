import { StyleSheet, View, Pressable } from "react-native";
import { Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Sparkles, Lock } from "lucide-react-native";

interface ProductRecognitionProps {
  isActive: boolean;
}

/**
 * Placeholder for future AI-powered product recognition.
 * Camera view with "Coming Soon" overlay — architecture ready for
 * Gemini vision integration when the feature ships.
 */
export function ProductRecognition({ isActive }: ProductRecognitionProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    requestPermission();
    return null;
  }

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Coming Soon overlay */}
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <Sparkles size={32} color="#f59e0b" />
          <Text style={styles.title}>Product Recognition</Text>
          <Text style={styles.subtitle}>Coming Soon</Text>
          <Text style={styles.description}>
            Photograph any assembled product and our AI will identify it
            instantly. Get the right guide, every time.
          </Text>
        </View>

        <View style={styles.featureList}>
          <FeatureItem text="Point camera at any furniture" />
          <FeatureItem text="AI identifies the exact product" />
          <FeatureItem text="Instant access to assembly guides" />
        </View>
      </View>
    </View>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Lock size={14} color="#a8a29e" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  badge: {
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: "IBMPlexSans_700Bold",
    color: "#ffffff",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  description: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_400Regular",
    color: "#d6d3d1",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
    maxWidth: 280,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "IBMPlexSans_400Regular",
    color: "#a8a29e",
  },
});
