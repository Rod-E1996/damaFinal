import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/theme';

/**
 * Gráfico de líneas sencillo con react-native-svg para mostrar la evolución
 * de mediciones (peso, glucosa, presión...). Se adapta al ancho disponible.
 * series: [{ label, color, values: [{ x: Date|number, y: number }] }]
 */
export default function LineChart({ series, height = 200, unit = '' }) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.values);

  if (all.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Aún no hay datos para graficar.</Text>
      </View>
    );
  }

  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const xs = all.map((p) => +p.x);
  const ys = all.map((p) => p.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minX === maxX) {
    minX -= 86400000;
    maxX += 86400000;
  }
  const spanY = maxY - minY || Math.max(1, Math.abs(maxY) * 0.1);
  minY -= spanY * 0.15;
  maxY += spanY * 0.15;

  const w = Math.max(width - pad.l - pad.r, 1);
  const h = height - pad.t - pad.b;
  const sx = (x) => pad.l + ((+x - minX) / (maxX - minX)) * w;
  const sy = (y) => pad.t + h - ((y - minY) / (maxY - minY)) * h;

  const ticks = [0, 0.5, 1].map((f) => minY + (maxY - minY) * f);
  const fmtDay = (ms) => {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Gráfico de evolución">
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((t, i) => (
            <Line key={`g${i}`} x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke={colors.border} strokeDasharray="4 4" />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={pad.l - 6} y={sy(t) + 4} fontSize="10" fill={colors.muted} textAnchor="end">
              {Math.round(t * 10) / 10}
            </SvgText>
          ))}
          <SvgText x={pad.l} y={height - 6} fontSize="10" fill={colors.muted}>
            {fmtDay(minX)}
          </SvgText>
          <SvgText x={width - pad.r} y={height - 6} fontSize="10" fill={colors.muted} textAnchor="end">
            {fmtDay(maxX)}
          </SvgText>
          {series.map((s) => {
            const pts = [...s.values].sort((a, b) => +a.x - +b.x);
            const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`).join(' ');
            return (
              <Path key={s.label} d={d} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
            );
          })}
          {series.map((s) =>
            s.values.map((p, i) => (
              <Circle key={`${s.label}${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={colors.white} stroke={s.color} strokeWidth={2} />
            ))
          )}
        </Svg>
      )}
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>
              {s.label}
              {unit ? ` (${unit})` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.muted },
});
