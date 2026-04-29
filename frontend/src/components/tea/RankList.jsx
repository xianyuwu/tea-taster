import { useState, useCallback } from 'react';
import { useTeaStore } from '../../stores/useTeaStore';
import { calcTotalScore } from '../../utils/score';
import { aiRecommend } from '../../api/ai';
import { readSSEStream } from '../../hooks/useSSE';
import RadarChart from './RadarChart';

const RANK_CLASSES = ['gold', 'silver', 'bronze'];

export default function RankList() {
  const teas = useTeaStore(s => s.teas);
  const dimensions = useTeaStore(s => s.dimensions);
  const teaFields = useTeaStore(s => s.teaFields);
  const recommendText = useTeaStore(s => s.recommendText);
  const setRecommendText = useTeaStore(s => s.setRecommendText);

  const [recommendLoading, setRecommendLoading] = useState(false);

  // 生成 AI 推荐理由
  const handleRecommend = useCallback(async () => {
    if (recommendLoading) return;
    setRecommendLoading(true);
    let fullText = '';
    try {
      const stream = await aiRecommend();
      await readSSEStream(
        stream,
        (chunk) => { fullText += chunk; setRecommendText(fullText); },
        () => { setRecommendLoading(false); }
      );
    } catch {
      setRecommendLoading(false);
    }
  }, [recommendLoading, setRecommendText]);

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
  const ranked = [...withTotal].sort((a, b) => b.total - a.total);

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
                {tea.rank}
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

      {/* 推荐购买 */}
      {hasAnyScore && topTea && topTea.total > 0 && (
        <div className="recommend-box">
          {/* 左侧：照片 + 茶名 + 分数 + 推荐标签 */}
          <div className="recommend-left">
            {topTea.photo ? (
              <img className="recommend-photo" src={`/data/photos/${topTea.photo}`} alt={topTea.name} />
            ) : (
              <span className="recommend-photo-placeholder">🍵</span>
            )}
            <div className="recommend-name">{topTea.name}</div>
            <div className="recommend-score">{topTea.total}/{maxScore}</div>
            <div className="recommend-badge">🏆 推荐购买</div>
          </div>

          {/* 右侧：AI 文字 + 按钮 */}
          <div className="recommend-right">
            {recommendText && (
              <div className="recommend-text">{recommendText}</div>
            )}
            {recommendLoading && !recommendText && (
              <div className="recommend-loading">
                <span className="ai-thinking-dots"><span></span><span></span><span></span></span>
              </div>
            )}

            <div className="recommend-btn-wrap">
              <button
                className="recommend-btn"
                onClick={handleRecommend}
                disabled={recommendLoading}
              >
                {recommendLoading ? '生成中...' : recommendText ? '🔄 重新生成推荐理由' : '✨ AI 生成推荐理由'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 雷达图 */}
      <RadarChart dimensions={dimensions} teas={teas} />
    </div>
  );
}
