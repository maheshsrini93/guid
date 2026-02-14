import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'guid-recent-products';
const MAX_RECENT = 5;

export interface RecentProduct {
  id: number;
  articleNumber: string;
  name: string | null;
  imageUrl: string | null;
  priceCurrent: number | null;
  priceCurrency: string | null;
  guideStatus: string;
}

export function useRecentProducts() {
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setRecentProducts(JSON.parse(stored));
        } catch {
          // corrupted data — reset
        }
      }
    });
  }, []);

  const addRecentProduct = useCallback(async (product: RecentProduct) => {
    setRecentProducts((prev) => {
      const filtered = prev.filter((p) => p.articleNumber !== product.articleNumber);
      const next = [product, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recentProducts, addRecentProduct };
}
