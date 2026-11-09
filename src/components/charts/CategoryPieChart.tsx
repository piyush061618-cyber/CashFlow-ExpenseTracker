import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { CategoryBreakdownItem } from '../../types';
import { formatINR } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  data: CategoryBreakdownItem[];
  totalPaise: number;
  size?: number;
}

export const CategoryPieChart: React.FC<Props> = ({ data, totalPaise, size = 180 }) => {
  const { colors, typography } = useTheme();

  if (!data || data.length === 0 || totalPaise === 0) {
    return (
      <View style={[styles.emptyContainer, { height: size }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No expense data available for this period.
        </Text>
      </View>
    );
  }

  const radius = size / 2;
  const strokeWidth = 32;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  let cumulativeAngle = 0;

  return (
    <View style={styles.container}>
      <View style={[styles.chartWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${radius}, ${radius}`}>
            {data.map((item, index) => {
              const strokeDashoffset = circumference - (circumference * item.percentage) / 100;
              const rotationAngle = (cumulativeAngle * 360) / 100;
              cumulativeAngle += item.percentage;

              return (
                <Circle
                  key={item.category_id || index}
                  stroke={item.category_color}
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  rotation={rotationAngle}
                  origin={`${radius}, ${radius}`}
                />
              );
            })}
          </G>
        </Svg>
        {/* Center Cutout Text */}
        <View style={styles.centerTextContainer}>
          <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text
            style={[styles.centerAmount, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatINR(totalPaise, { showDecimals: false })}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {data.slice(0, 6).map((item) => (
          <View key={item.category_id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.category_color }]} />
            <Text
              style={[styles.legendName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.category_name}
            </Text>
            <Text style={[styles.legendPercent, { color: colors.textSecondary }]}>
              {item.percentage.toFixed(1)}%
            </Text>
            <Text style={[styles.legendAmount, { color: colors.text }]}>
              {formatINR(item.total_paise, { showDecimals: false })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60%',
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  centerAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: 12,
    marginRight: 10,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
