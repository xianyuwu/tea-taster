import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { useTeaStore } from '../../stores/useTeaStore';
import { calcTotalScore } from '../../utils/score';
import { aiAnalyze } from '../../api/ai';
import { readSSEStream } from '../../hooks/useSSE';

const SECTION_ICONS = ['🍃', '⚖️', '🛒', '☕', '📝', '🔥', '📦', '🏆'];

export default function AiReport() {
  const teas = useTeaStore(s => s.teas);
  const dimensions = useTeaStore(s => s.dimensions);
  const report = useTeaStore(s => s.report);
  const reportMeta = useTeaStore(s => s.reportMeta);
  const setReport = useTeaStore(s => s.setReport);
  const setReportMeta = useTeaStore(s => s.setReportMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxScore = dimensions.length * 5;
  const scoredTeas = teas.filter(t =>
    Object.values(t.scores || {}).some(v => (Number(v) || 0) > 0)
  );

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    let fullText = '';
    try {
      const stream = await aiAnalyze();
      await readSSEStream(
        stream,
        (chunk) => {
          fullText += chunk;
          setReport(fullText);
        },
        () => {
          setReport(fullText);
          setReportMeta({ created_at: new Date().toLocaleString('zh-CN'), stale: false });
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err.message || 'AI 分析失败');
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>岩茶品鉴报告</title>
      <style>
        body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; color: #3a2e2a; line-height: 1.6; }
        h2 { border-bottom: 2px solid #8b5e3c; padding-bottom: 6px; color: #5c3a21; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #e8ddd0; padding: 6px 10px; font-size: 0.9rem; }
        th { background: #faf6f1; }
      </style>
      </head><body>${DOMPurify.sanitize(document.getElementById('report-content')?.innerHTML || '')}</body></html>
    `);
    printWin.document.close();
    printWin.print();
  };

  // Split report into sections by ## headings
  const renderReport = () => {
    if (!report) return null;

    const parts = report.split(/(^## .+$)/m);
    const sections = [];
    let currentSection = null;

    for (const part of parts) {
      if (/^## (.+)$/.test(part)) {
        if (currentSection) sections.push(currentSection);
        const title = part.replace(/^## /, '').trim();
        currentSection = { title, content: '' };
      } else if (currentSection) {
        currentSection.content += part;
      } else {
        if (part.trim()) {
          sections.push({ title: null, content: part });
        }
      }
    }
    if (currentSection) sections.push(currentSection);

    return sections.map((sec, i) => {
      const icon = sec.title ? SECTION_ICONS[i % SECTION_ICONS.length] : null;
      return (
        <div key={i} className="ai-card">
          {sec.title && (
            <div className="ai-card-title">
              <span>{icon}</span>
              {sec.title}
            </div>
          )}
          <div className="ai-card-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sec.content}
            </ReactMarkdown>
          </div>
        </div>
      );
    });
  };

  // Find best tea for report header
  const best = scoredTeas.length > 0
    ? scoredTeas.reduce((a, b) => calcTotalScore(a) > calcTotalScore(b) ? a : b)
    : null;
  const bestScore = best ? calcTotalScore(best) : 0;

  return (
    <div>
      {/* Report header (old version: header first, then score overview) */}
      {report && (
        <div id="report-content">
          <div className="ai-report-header">
            <h3>🍵 AI 品鉴分析报告</h3>
            <div className="ai-report-meta">
              {reportMeta?.created_at && (
                <span>📅 {reportMeta.created_at}</span>
              )}
              <span>🍃 {scoredTeas.length} 款茶样</span>
              {best && (
                <span>🏆 最高分 {bestScore}/{maxScore}（{best.name}）</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score overview */}
      {scoredTeas.length > 0 && (
        <div className="ai-score-overview">
          <div className="ai-score-overview-title">📊 评分速览</div>
          {scoredTeas.map(tea => {
            const total = calcTotalScore(tea);
            return (
              <div key={tea.id} className="ai-score-item">
                <span className="ai-score-item-name">{tea.name}</span>
                <div className="ai-score-item-bars">
                  {dimensions.map(dim => {
                    const score = tea.scores?.[dim.key] || 0;
                    const barPct = (score / 5) * 100;
                    return (
                      <div key={dim.key} style={{ flex: 1, minWidth: 24, textAlign: 'center' }}>
                        <div className="ai-score-dim-bar">
                          <div className="ai-score-dim-fill" style={{ width: `${barPct}%` }} />
                        </div>
                        <div className="ai-score-dim-label">{dim.name}</div>
                      </div>
                    );
                  })}
                </div>
                <span className="ai-score-item-total">{total}/{maxScore}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Stale warning */}
      {reportMeta?.stale && (
        <div className="ai-report-stale-hint">
          ⚠️ 评分数据已变更，报告可能过时
          <button onClick={handleAnalyze}>重新分析</button>
        </div>
      )}

      {/* Report sections */}
      {report && renderReport()}

      {/* Streaming indicator */}
      {report && loading && (
        <span className="ai-cursor"></span>
      )}

      {/* Loading state */}
      {loading && !report && (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <div className="ai-thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <div style={{ marginTop: 10, color: '#a08a78', fontSize: '0.85rem' }}>
            AI 正在分析中...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="status-msg err">{error}</div>
      )}

      {/* Action buttons */}
      <div className="ai-report-actions">
        <button
          className="ai-btn"
          onClick={handleAnalyze}
          disabled={loading || teas.length === 0}
        >
          {loading ? '分析中...' : report ? '🔄 重新分析' : '🤖 AI 分析'}
        </button>
        {report && !loading && (
          <>
            <button className="ai-report-action-btn" onClick={handleCopy}>
              📋 复制报告
            </button>
            <button className="ai-report-action-btn" onClick={handleExportPDF}>
              🖨️ 导出 PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
