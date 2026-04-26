import { useTeaStore } from '../../stores/useTeaStore';

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_CLASSES = ['gold', 'silver', 'bronze'];

export default function RankList() {
  const teas = useTeaStore(s => s.teas);
  const dimensions = useTeaStore(s => s.dimensions);
  const teaFields = useTeaStore(s => s.teaFields);

  if (!teas || teas.length === 0) {
    return (
      <div className="empty-hint">暂无茶样数据，请先添加茶样</div>
    );
  }

  const maxScore = dimensions.length * 5;
  const withTotal = teas.map(t => ({
    ...t,
    total: Object.values(t.scores || {}).reduce((s, v) => s + (Number(v) || 0), 0),
  }));
  const ranked = [...withTotal].sort((a, b) => b.total - a.total);

  // Dense ranking: same score = same rank, next rank doesn't skip
  // e.g. 20,15,15,10 → 1,2,2,3
  const uniqueTotals = [...new Set(ranked.map(t => t.total))].sort((a, b) => b - a);
  const rankedWithRank = ranked.map(t => ({
    ...t,
    rank: uniqueTotals.indexOf(t.total) + 1,
  }));

  const hasAnyScore = rankedWithRank.some(t => t.total > 0);
  const topTea = rankedWithRank[0];

  return (
    <div>
      {/* Ranked list */}
      <div className="ranking">
        {rankedWithRank.map((tea, idx) => {
          const rankClass = idx < 3 ? RANK_CLASSES[idx] : '';
          const pct = maxScore > 0 ? Math.round((tea.total / maxScore) * 100) : 0;

          return (
            <div key={tea.id} className={`rank-item ${rankClass}`}>
              <span className="rank-num">
                {idx < 3 ? `${MEDALS[idx]} ${tea.rank}` : tea.rank}
              </span>

              {tea.photo ? (
                <img
                  className="rank-photo"
                  src={`/data/photos/${tea.photo}`}
                  alt={tea.name}
                />
              ) : (
                <div className="rank-photo" style={{
                  background: '#ebe0d3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                }}>
                  🍵
                </div>
              )}

              <div className="rank-info">
                <div className="rank-tea-name">{tea.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {teaFields.map(f => {
                    const val = tea[f.key];
                    if (!val) return null;
                    return (
                      <span key={f.key} className="tea-meta-pill">
                        {f.label}: {val}{f.unit ? f.unit : ''}
                      </span>
                    );
                  })}
                </div>
                <div className="rank-tea-score">
                  总分 {tea.total}/{maxScore}（{pct}%）
                </div>
                <div className="rank-bar-bg">
                  <div className="rank-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation box - after ranking list */}
      {hasAnyScore && topTea && topTea.total > 0 && (
        <div className="recommend-box">
          {topTea.photo ? (
            <img src={`/data/photos/${topTea.photo}`} alt={topTea.name} />
          ) : (
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 8 }}>🏆</span>
          )}
          <div style={{ fontWeight: 700, color: '#d4380d', marginBottom: 4 }}>
            🏆 推荐购买：<b>{topTea.name}</b>
          </div>
          <div style={{ color: '#8a7060' }}>
            总分 {topTea.total}/{maxScore}
          </div>
        </div>
      )}
    </div>
  );
}
