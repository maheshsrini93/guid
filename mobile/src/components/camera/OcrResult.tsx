import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { Hash, Search, X } from "lucide-react-native";
import { useTheme } from "../../theme";
import { Text } from "../ui";

interface OcrResultProps {
  articleNumbers: string[];
  rawText: string;
  onSelectArticle: (articleNumber: string) => void;
  onSearchText: (text: string) => void;
  onDismiss: () => void;
}

export function OcrResult({
  articleNumbers,
  rawText,
  onSelectArticle,
  onSearchText,
  onDismiss,
}: OcrResultProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h4" color={colors.foreground}>
            Text Extracted
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

        {/* Article numbers found */}
        {articleNumbers.length > 0 && (
          <View style={styles.section}>
            <Text variant="bodySmall" color={colors.mutedForeground} style={styles.sectionLabel}>
              ARTICLE NUMBERS FOUND
            </Text>
            <View style={styles.articleList}>
              {articleNumbers.map((num) => (
                <Pressable
                  key={num}
                  style={[
                    styles.articleChip,
                    { backgroundColor: colors.accent, borderColor: colors.primary },
                  ]}
                  onPress={() => onSelectArticle(num)}
                  accessibilityLabel={`Search for product ${num}`}
                  accessibilityRole="button"
                >
                  <Hash size={14} color={colors.primary} />
                  <Text variant="mono" color={colors.foreground}>
                    {num}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Raw text preview */}
        {rawText && (
          <View style={styles.section}>
            <Text variant="bodySmall" color={colors.mutedForeground} style={styles.sectionLabel}>
              DETECTED TEXT
            </Text>
            <ScrollView
              style={[styles.rawTextContainer, { backgroundColor: colors.muted }]}
              nestedScrollEnabled
            >
              <Text variant="mono" color={colors.mutedForeground} numberOfLines={6} style={styles.rawText}>
                {rawText}
              </Text>
            </ScrollView>
            <Pressable
              style={styles.searchTextButton}
              onPress={() => onSearchText(rawText)}
              accessibilityLabel="Search with extracted text"
              accessibilityRole="button"
            >
              <Search size={14} color={colors.primary} />
              <Text variant="bodySmall" color={colors.primary}>
                Search with this text
              </Text>
            </Pressable>
          </View>
        )}

        {/* No results */}
        {articleNumbers.length === 0 && !rawText && (
          <Text variant="body" color={colors.mutedForeground} style={styles.noResults}>
            No text could be extracted. Try with better lighting or a different angle.
          </Text>
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
    maxHeight: 320,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  articleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  articleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  rawTextContainer: {
    maxHeight: 80,
    borderRadius: 8,
    padding: 10,
  },
  rawText: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchTextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
  },
  noResults: {
    textAlign: "center",
    paddingVertical: 8,
  },
});
