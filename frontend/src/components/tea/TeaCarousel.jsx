export default function TeaCarousel({ teas, currentIndex, onSelect, children }) {
  if (!teas || teas.length === 0) return null;

  const handlePrev = () => {
    const prev = currentIndex > 0 ? currentIndex - 1 : teas.length - 1;
    onSelect(prev);
  };

  const handleNext = () => {
    const next = currentIndex < teas.length - 1 ? currentIndex + 1 : 0;
    onSelect(next);
  };

  return (
    <div>
      <div className="carousel-nav">
        <button
          className="carousel-btn"
          onClick={handlePrev}
          disabled={teas.length <= 1}
          aria-label="上一款"
        >
          ←
        </button>
        <div className="carousel-dots">
          {teas.map((tea, idx) => (
            <button
              key={tea.id}
              className={`carousel-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => onSelect(idx)}
            >
              {tea.name}
            </button>
          ))}
        </div>
        <button
          className="carousel-btn"
          onClick={handleNext}
          disabled={teas.length <= 1}
          aria-label="下一款"
        >
          →
        </button>
      </div>
      {children}
    </div>
  );
}
