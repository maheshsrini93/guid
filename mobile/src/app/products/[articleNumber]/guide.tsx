import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { List } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';

import { CompletionScreen } from '../../../components/guide/CompletionScreen';
import { ProgressBar } from '../../../components/guide/ProgressBar';
import { StepCard } from '../../../components/guide/StepCard';
import { Toc } from '../../../components/guide/Toc';
import { Button, Text } from '../../../components/ui';
import { useGuideProgress } from '../../../hooks/useGuideProgress';
import { useTheme } from '../../../theme';
import { spacing } from '../../../theme/spacing';
import { getProduct } from '../../../services/products';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  imageUrl: string | null;
  tip: string | null;
  warning: string | null;
}

interface Guide {
  id: string;
  title: string;
  difficulty: string;
  timeMinutes: number | null;
  tools: string | null;
  published: boolean;
  steps: GuideStep[];
}

export default function GuideViewerScreen() {
  const { articleNumber } = useLocalSearchParams<{ articleNumber: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tocVisible, setTocVisible] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const { currentStep, setCurrentStep, isLoading: progressLoading } =
    useGuideProgress(articleNumber ?? '');

  // Fetch the guide
  useEffect(() => {
    if (!articleNumber) return;

    (async () => {
      try {
        const data = await getProduct(articleNumber) as unknown as {
          guide: Guide | null;
        };
        if (data.guide && data.guide.published) {
          setGuide(data.guide);
        } else {
          setError('No published guide found for this product.');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load guide'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [articleNumber]);

  // Scroll to saved progress once loaded
  useEffect(() => {
    if (!progressLoading && guide && currentStep > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentStep,
          animated: false,
        });
      }, 100);
    }
  }, [progressLoading, guide]); // only on initial load

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const newIndex = viewableItems[0].index;
        setCurrentStep(newIndex);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Check if at the end
        if (guide && newIndex === guide.steps.length - 1) {
          // Allow user to see last step before showing completion
        }
      }
    },
    [guide, setCurrentStep]
  );

  const viewabilityConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const scrollToStep = useCallback(
    (index: number) => {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setTocVisible(false);
    },
    []
  );

  const handleComplete = useCallback(() => {
    setShowCompletion(true);
  }, []);

  const totalSteps = guide?.steps.length ?? 0;
  const isLastStep = currentStep === totalSteps - 1;

  if (loading || progressLoading) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: true, title: 'Assembly Guide' }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !guide) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: true, title: 'Assembly Guide' }}
        />
        <View style={styles.centered}>
          <Text variant="body" color={colors.destructive}>
            {error ?? 'Guide not available'}
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  if (showCompletion) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
          <CompletionScreen
            totalSteps={totalSteps}
            onBackToProduct={() => router.back()}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: guide.title,
          headerRight: () => (
            <Pressable
              onPress={() => setTocVisible(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Open table of contents"
            >
              <List size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Progress bar */}
        <ProgressBar current={currentStep} total={totalSteps} />

        {/* Step counter */}
        <View style={styles.stepCounter}>
          <Text variant="bodySmall" color={colors.mutedForeground}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>

        {/* Horizontal step viewer */}
        <FlatList
          ref={flatListRef}
          data={guide.steps}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfigRef.current}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StepCard
              stepNumber={item.stepNumber}
              title={item.title}
              instruction={item.instruction}
              imageUrl={item.imageUrl}
              tip={item.tip}
              warning={item.warning}
            />
          )}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            // fallback: scroll to nearest and then retry
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
        />

        {/* Complete button on last step */}
        {isLastStep && (
          <View style={styles.completeBar}>
            <Button variant="primary" size="lg" onPress={handleComplete}>
              Complete Guide
            </Button>
          </View>
        )}

        {/* TOC bottom sheet (modal) */}
        <Modal
          visible={tocVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setTocVisible(false)}
        >
          <Toc
            steps={guide.steps.map((s) => ({
              stepNumber: s.stepNumber,
              title: s.title,
            }))}
            currentStep={currentStep}
            onStepPress={scrollToStep}
            onClose={() => setTocVisible(false)}
          />
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepCounter: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  completeBar: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
});
