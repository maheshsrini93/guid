import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { Check, X, Search, ExternalLink } from "lucide-react-native";
import { useTheme } from "../../theme";
import { Text } from "../ui";

interface ScanResultProps {
  barcode: string;
  barcodeType: string;
  product: {
    articleNumber: string;
    name: string;
    imageUrl?: string;
    hasGuide: boolean;
  } | null;
  isLoading: boolean;
  onViewProduct: (articleNumber: string) => void;
  onSearchManually: () => void;
  onDismiss: () => void;
}

export function ScanResult({
  barcode,
  barcodeType,
  product,
  isLoading,
  onViewProduct,
  onSearchManually,
  onDismiss,
}: ScanResultProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.barcodeLabelWrap, { backgroundColor: colors.muted }]}>
            <Text variant="mono" style={styles.barcodeLabelText} color={colors.mutedForeground}>
              {barcodeType.toUpperCase()}
            </Text>
          </View>
          <Text variant="mono" color={colors.foreground} style={styles.barcodeValue}>
            {barcode}
          </Text>
          <Pressable
            onPress={onDismiss}
            style={styles.dismissButton}
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
          >
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="body" color={colors.mutedForeground}>
              Searching product...
            </Text>
          </View>
        ) : product ? (
          <View style={styles.productContainer}>
            <View style={styles.productInfo}>
              <Check size={20} color={colors.success} />
              <View style={styles.productText}>
                <Text variant="body" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text variant="mono" color={colors.mutedForeground}>
                  {product.articleNumber}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.viewButton, { backgroundColor: colors.primary }]}
              onPress={() => onViewProduct(product.articleNumber)}
              accessibilityLabel={`View ${product.name}`}
              accessibilityRole="button"
            >
              <ExternalLink size={16} color={colors.primaryForeground} />
              <Text variant="body" color={colors.primaryForeground} style={styles.viewButtonText}>
                {product.hasGuide ? "View Guide" : "View Product"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.notFoundContainer}>
            <Text variant="body" color={colors.mutedForeground}>
              No product found for this barcode
            </Text>
            <Pressable
              style={[styles.searchButton, { borderColor: colors.primary }]}
              onPress={onSearchManually}
              accessibilityLabel="Search manually"
              accessibilityRole="button"
            >
              <Search size={16} color={colors.primary} />
              <Text variant="body" color={colors.primary}>
                Search Manually
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  barcodeLabelWrap: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  barcodeLabelText: {
    fontSize: 10,
  },
  barcodeValue: {
    fontSize: 14,
    flex: 1,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  productContainer: {
    gap: 12,
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  productText: {
    flex: 1,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewButtonText: {
    fontWeight: "600",
  },
  notFoundContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 10,
  },
});
