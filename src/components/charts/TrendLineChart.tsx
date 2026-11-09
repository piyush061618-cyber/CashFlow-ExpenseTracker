import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { formatINR } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';

interface TrendPoint {
  label: string; // 'Jan', 'Feb', etc.
  amountPaise: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
}

export const TrendLineChart: React.FC<Props> = ({ data, height = 180 }) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No trend data recorded.
        </Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.amountPaise), 1);
  const chartHeight = height - 45;
  const paddingX = 24;
  const totalSvgWidth = Math.max(data.length * 45, 320);
  const stepX = (totalSvgWidth - paddingX * 2) / Math.max(data.length - 1, 1);

  // Compute points
  const points = data.map((item, index) => {
    const x = paddingX + index * stepX;
    const y = chartHeight - (item.amountPaise / maxVal) * (chartHeight - 24);
    return { x, y, ...item };
  });

  // Construct path string
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${points[i].x} ${points[i].y}`;
  }

  // Construct fill path for gradient
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${totalSvgWidth} ${height}`}>
        <Defs>
          <LinearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Baseline */}
        <Line
          x1={paddingX}
          y1={chartHeight}
          x2={totalSvgWidth - paddingX}
          y2={chartHeight}
          stroke={colors.border}
          strokeWidth="1"
        />

        {/* Area fill */}
        <Path d={areaPath} fill="url(#trendGradient)" />

        {/* Line stroke */}
        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth="3" />

        {/* Data point circles and labels */}
        {points.map((p, idx) => (
          <React.Fragment key={idx}>
            <Circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={colors.card}
              stroke={colors.primary}
              strokeWidth="2.5"
            />
            <SvgText
              x={p.x}
              y={chartHeight + 18}
              fontSize="10"
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

