import { useState, useCallback } from 'react';
import { useTeaStore } from '../../stores/useTeaStore';
import { calcTotalScore } from '../../utils/score';

function parseNum(s) {
  if (s == null) return NaN;
  const str = String(s).trim();
  const m = str.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
}

function heatMapBg(value, min, max) {
  if (isNaN(value) || min === max) return {};
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(180 + ratio * 75);
  const g = Math.round(200 - ratio * 70);
  const b = Math.round(120 - ratio * 60);
  return { background: `rgba(${r}, ${g}, ${b}, 0.18)`, fontWeight: 600 };
}

function computeDerived(tea, metric) {
  const num = parseNum(tea[metric.numerator]);
  const den = parseNum(tea[metric.denominator]);
  if (isNaN(num) || isNaN(den) || den === 0) return null;
  return num / den;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ComparisonTable() {
  const teas = useTeaStore(s => s.teas);
  const dimensions = useTeaStore(s => s.dimensions);
  const teaFields = useTeaStore(s => s.teaFields);
  const derivedMetrics = useTeaStore(s => s.derivedMetrics);

  const [preview, setPreview] = useState(null);

  const handlePhotoEnter = useCallback((e, photoUrl) => {
    if (!photoUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPreview({
      url: photoUrl,
      top: rect.bottom + 4,
      left: Math.max(4, rect.left + rect.width / 2 - 90),
    });
  }, []);

  const handlePhotoLeave = useCallback(() => {
    setPreview(null);
  }, []);

  if (!teas || teas.length === 0) {
    return (
      <div className="empty-hint">暂无茶样数据，请先添加茶样</div>
    );
  }

  const maxScore = dimensions.length * 5;
  const withTotal = teas.map(t => ({
    ...t,
    total: calcTotalScore(t),
  }));
  const sorted = [...withTotal].sort((a, b) => b.total - a.total);

  // Assign ranks (handle ties)
  const rankMap = {};
  let rank = 0;
  let prevTotal = -1;
  sorted.forEach((t, i) => {
    if (t.total !== prevTotal) {
      rank = i + 1;
      prevTotal = t.total;
    }
    rankMap[t.id] = rank;
  });

  // Compute derived metric ranges for color mapping
  const derivedRanges = derivedMetrics.map(metric => {
    const values = withTotal.map(t => computeDerived(t, metric)).filter(v => v !== null);
    const min = values.length >= (metric.minRequired || 2) ? Math.min(...values) : NaN;
    const max = values.length >= (metric.minRequired || 2) ? Math.max(...values) : NaN;
    return { min, max };
  });

  // Check if all scores are same for a dimension (no "best")
  const isAllSame = (arr) => arr.length > 0 && arr.every(v => v === arr[0]);

  return (
    <div className="table-wrap">
      {preview && (
        <div className="th-photo-preview-fixed" style={{ top: preview.top, left: preview.left }}>
          <img src={preview.url} alt="" />
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>维度</th>
            {withTotal.map(t => (
              <th key={t.id}>
                <div className="th-tea">
                  {t.photo && (
                    <img
                      src={`/data/photos/${t.photo}`}
                      alt={t.name}
                      onMouseEnter={e => handlePhotoEnter(e, `/data/photos/${t.photo}`)}
                      onMouseLeave={handlePhotoLeave}
                    />
                  )}
                  <span>{t.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Tea fields rows (info rows) */}
          {teaFields.map(field => (
            <tr key={field.key} className="info-row">
              <td>{field.label}</td>
              {withTotal.map(t => (
                <td key={t.id} className={field.align === 'left' ? 'left-align' : ''}>
                  {t[field.key] != null && t[field.key] !== ''
                    ? `${t[field.key]}${field.unit ? ' ' + field.unit : ''}`
                    : '-'}
                </td>
              ))}
            </tr>
          ))}

          {/* Derived metrics rows */}
          {derivedMetrics.map((metric, mi) => (
            <tr key={metric.key} className="derived-row">
              <td>{metric.label}</td>
              {withTotal.map(t => {
                const val = computeDerived(t, metric);
                const range = derivedRanges[mi];
                const hasColor = metric.colorMap && !isNaN(range.min);
                return (
                  <td key={t.id} style={hasColor && val !== null ? heatMapBg(val, range.min, range.max) : {}}>
                    {val !== null ? `${val.toFixed(2)}${metric.unit ? ' ' + metric.unit : ''}` : '-'}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Dimension score rows */}
          {dimensions.map((dim, di) => {
            const scores = withTotal.map(t => t.scores?.[dim.key] || 0);
            const best = Math.max(...scores);
            const hasBest = best > 0 && !isAllSame(scores);
            return (
              <tr key={dim.key} className={di === 0 ? 'score-sep' : ''}>
                <td>{dim.name}</td>
                {withTotal.map((t, i) => {
                  const score = scores[i];
                  const isBest = hasBest && score === best;
                  return (
                    <td key={t.id} className={`score-cell ${isBest ? 'best-score' : ''}`}>
                      {score}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Total row */}
          <tr className="total-row">
            <td>总分</td>
            {withTotal.map(t => (
              <td key={t.id}>
                {t.total}/{maxScore}
              </td>
            ))}
          </tr>

          {/* Rank row */}
          <tr className="rank-row">
            <td>🏆 排名</td>
            {withTotal.map(t => {
              const r = rankMap[t.id];
              return (
                <td key={t.id}>
                  {r <= 3 ? `${MEDALS[r - 1]} 第${r}名` : `第${r}名`}
                </td>
              );
            })}
          </tr>

          {/* Note row */}
          <tr>
            <td>备注</td>
            {withTotal.map(t => (
              <td key={t.id} className="left-align" style={{ maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {t.note || '-'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
