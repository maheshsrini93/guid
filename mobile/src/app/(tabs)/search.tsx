import { useRouter } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductCard } from "../../components/product/ProductCard";
import { Text } from "../../components/ui";
import { getProducts } from "../../services/products";
import { useTheme } from "../../theme";
import { spacing } from "../../theme/spacing";

interface ProductListItem {
  id: number;
  articleNumber: string;
  name: string | null;
  type: string | null;
  priceCurrency: string | null;
  priceCurrent: number | null;
  avgRating: number | null;
  assemblyRequired: boolean | null;
  guideStatus: string;
  imageUrl: string | null;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);
      try {
        const data = await getProducts({ q: text.trim(), limit: "30" });
        setResults(data.products);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search input */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <SearchIcon size={20} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Search products, article numbers..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search products"
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.centered}>
          <Text variant="body" color={colors.mutedForeground}>
            No products found for "{query}"
          </Text>
        </View>
      ) : !searched ? (
        <View style={styles.centered}>
          <SearchIcon size={48} color={colors.border} />
          <Text variant="body" color={colors.mutedForeground}>
            Find assembly guides for any product
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.articleNumber}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/products/${item.articleNumber}`)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.name ?? item.articleNumber}`}
            >
              <ProductCard
                articleNumber={item.articleNumber}
                name={item.name}
                imageUrl={item.imageUrl}
                priceCurrent={item.priceCurrent}
                priceCurrency={item.priceCurrency}
                guideStatus={item.guideStatus}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 16,
    height: "100%",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
