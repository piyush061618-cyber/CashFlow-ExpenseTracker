import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { formatINR } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';

interface DailyBarData {
  label: string; // 'Mon', 'Tue', etc.
  totalPaise: number;
  dateStr: string;
}

interface Props {
  data: DailyBarData[];
  height?: number;
}

export const WeeklyBarChart: React.FC<Props> = ({ data, height = 160 }) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No spending records for this week yet.
        </Text>
      </View>
    );
  }

  const maxPaise = Math.max(...data.map((d) => d.totalPaise), 1);
  const chartHeight = height - 40; // leave room for labels
  const barWidth = 24;
  const gap = 16;
  const totalSvgWidth = data.length * (barWidth + gap);

  return (
    <View style={styles.container}>
      <View style={styles.chartBox}>
        <Svg width="100%" height={height} viewBox={`0 0 ${totalSvgWidth} ${height}`}>
          {/* Baseline */}
          <Line
            x1="0"
            y1={chartHeight}
            x2={totalSvgWidth}
            y2={chartHeight}
            stroke={colors.border}
            strokeWidth="1"
          />

          {data.map((item, index) => {
            const isHighest = item.totalPaise === maxPaise && maxPaise > 0;
            const barH = item.totalPaise > 0 ? (item.totalPaise / maxPaise) * (chartHeight - 16) : 4;
            const x = index * (barWidth + gap) + gap / 2;
            const y = chartHeight - barH;

            return (
              <React.Fragment key={item.dateStr || index}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="6"
                  ry="6"
                  fill={isHighest ? colors.expense : colors.primaryLight}
                />

                {/* Day Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  fontSize="11"
                  fill={isHighest ? colors.expense : colors.textSecondary}
                  fontWeight={isHighest ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Summary caption */}
      <View style={styles.footerRow}>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          Peak Day:{' '}
          <Text style={{ color: colors.expense, fontWeight: '700' }}>
            {data.find((d) => d.totalPaise === maxPaise && maxPaise > 0)?.label || 'None'} (
            {formatINR(maxPaise, { showDecimals: false })})
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  chartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  caption: {
    fontSize: 12,
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

