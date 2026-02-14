import { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Image,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Camera, ImageIcon, X } from "lucide-react-native";
import { useTheme } from "../../theme";
import { Text } from "../ui";

interface ChatImagePickerProps {
  onImageSelected: (base64: string, uri: string) => void;
  onCancel: () => void;
}

export function ChatImagePicker({
  onImageSelected,
  onCancel,
}: ChatImagePickerProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { colors } = useTheme();

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        onImageSelected(asset.base64, asset.uri);
      }
    }
  };

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        Alert.alert(
          "Camera Permission",
          "Camera access is required to take photos for troubleshooting."
        );
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        onImageSelected(asset.base64, asset.uri);
      }
    }
  };

  const showOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          if (buttonIndex === 2) pickFromLibrary();
        }
      );
    } else {
      Alert.alert("Add Photo", "Choose a source", [
        { text: "Camera", onPress: takePhoto },
        { text: "Photo Library", onPress: pickFromLibrary },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.muted, borderTopColor: colors.border },
      ]}
    >
      <Pressable
        style={styles.option}
        onPress={takePhoto}
        accessibilityLabel="Take a photo"
        accessibilityRole="button"
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.accent, borderColor: colors.primary },
          ]}
        >
          <Camera size={20} color={colors.primary} />
        </View>
        <Text variant="bodySmall" color={colors.mutedForeground}>
          Camera
        </Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={pickFromLibrary}
        accessibilityLabel="Choose from library"
        accessibilityRole="button"
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.accent, borderColor: colors.primary },
          ]}
        >
          <ImageIcon size={20} color={colors.primary} />
        </View>
        <Text variant="bodySmall" color={colors.mutedForeground}>
          Library
        </Text>
      </Pressable>

      <Pressable
        style={styles.cancelButton}
        onPress={onCancel}
        accessibilityLabel="Cancel"
        accessibilityRole="button"
      >
        <X size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

/** Inline image preview before sending */
export function ChatImagePreview({
  uri,
  onRemove,
}: {
  uri: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.previewContainer}>
      <Image source={{ uri }} style={styles.previewImage} />
      <Pressable
        style={styles.removeButton}
        onPress={onRemove}
        accessibilityLabel="Remove image"
        accessibilityRole="button"
      >
        <X size={14} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  option: {
    alignItems: "center",
    gap: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  previewContainer: {
    position: "relative",
    marginRight: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
