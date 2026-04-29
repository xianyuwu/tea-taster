/**
 * 纯数据驱动的 SVG 雷达图 —— 不依赖 AI，直接用评分数据画图
 * props: { dimensions: Array<{ key, name }>, teas: Array<{ name, scores }> }
 * 每款茶一个多边形，叠加在同一张图上对比风味轮廓
 * 支持通过复选框勾选/取消显示某款茶
 */

import { useState, useEffect } from 'react';

// 茶色系配色
const COLORS = ['#5c3a21', '#8b5e3c', '#c49a3c', '#4a7c59', '#7a6b5d'];

export default function RadarChart({ dimensions, teas }) {
  const n = dimensions.length;
  // 至少 3 个维度才有意义
  if (n < 3 || !teas || teas.length === 0) return null;

  // 只显示有评分的茶
  const scored = teas.filter(t =>
    Object.values(t.scores || {}).some(v => (Number(v) || 0) > 0)
  );
  if (scored.length === 0) return null;

  // 勾选状态：用茶名集合表示，默认全部勾选
  const [hidden, setHidden] = useState(new Set());

  // 茶样列表变化时，清理已不存在的茶名
  useEffect(() => {
    setHidden(prev => {
      const names = new Set(scored.map(t => t.name));
      const next = new Set([...prev].filter(name => names.has(name)));
      return next.size === prev.size ? prev : next;
    });
  }, [scored.map(t => t.name).join(',')]);

  // 实际要画的茶（排除被隐藏的）
  const visible = scored.filter(t => !hidden.has(t.name));

  const toggle = (name) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = 130;

  const angle = (i) => (i * 2 * Math.PI) / n - Math.PI / 2;

  // value 对应的坐标点（1-5 分映射到 0-r）
  const point = (i, value) => ({
    x: cx + (value / 5) * r * Math.cos(angle(i)),
    y: cy + (value / 5) * r * Math.sin(angle(i)),
  });

  const polygon = (values) =>
    dimensions.map((d, i) => {
      const p = point(i, Number(values[d.key]) || 0);
      return `${p.x},${p.y}`;
    }).join(' ');

  // 切换全选/全不选
  const allVisible = hidden.size === 0;
  const toggleAll = () => {
    if (allVisible) {
      setHidden(new Set(scored.map(t => t.name)));
    } else {
      setHidden(new Set());
    }
  };

  return (
    <div className="ai-radar-wrap">
      <div className="ai-score-overview-title">
        📊 风味轮廓
        {scored.length > 1 && (
          <button className="ai-radar-toggle-all" onClick={toggleAll}>
            {allVisible ? '全部隐藏' : '全部显示'}
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="ai-radar-svg">
        {/* 5 层参考网格 */}
        {[1, 2, 3, 4, 5].map(level => (
          <polygon
            key={level}
            points={polygon(dimensions.reduce((acc, d) => ({ ...acc, [d.key]: level }), {}))}
            className="ai-radar-grid"
          />
        ))}

        {/* 轴线 */}
        {dimensions.map((_, i) => {
          const edge = point(i, 5);
          return (
            <line key={i} x1={cx} y1={cy} x2={edge.x} y2={edge.y} className="ai-radar-axis" />
          );
        })}

        {/* 只画被勾选的茶 */}
        {visible.map((tea) => {
          const idx = scored.indexOf(tea);
          return (
            <polygon
              key={tea.id || tea.name}
              points={polygon(tea.scores || {})}
              fill={COLORS[idx % COLORS.length]}
              fillOpacity={0.15}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
            />
          );
        })}

        {/* 维度标签 */}
        {dimensions.map((dim, i) => {
          const p = point(i, 5.7);
          return (
            <text key={dim.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="ai-radar-label">
              {dim.name}
            </text>
          );
        })}
      </svg>

      {/* 可交互的图例：每款茶一个复选框 */}
      {scored.length > 1 && (
        <div className="ai-radar-legend">
          {scored.map((tea, idx) => (
            <label key={tea.id || tea.name} className="ai-radar-legend-item" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!hidden.has(tea.name)}
                onChange={() => toggle(tea.name)}
                style={{ accentColor: COLORS[idx % COLORS.length] }}
              />
              <span className="ai-radar-legend-dot" style={{ background: COLORS[idx % COLORS.length] }} />
              {tea.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
