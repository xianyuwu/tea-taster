export default function StarRating({ dimension, value, onChange }) {
  const { key, name, desc } = dimension;

  const handleClick = (starVal) => {
    const newVal = value === starVal ? 0 : starVal;
    onChange(key, newVal);
  };

  return (
    <div className="rating-row">
      <div>
        <span className="rating-label">{name}</span>
        {desc && <span className="rating-desc">{desc}</span>}
      </div>
      <div className="star-group">
        {[1, 2, 3, 4, 5].map(starVal => (
          <button
            key={starVal}
            className={`star ${starVal <= value ? 'active' : ''}`}
            onClick={() => handleClick(starVal)}
            aria-label={`${name} ${starVal} 分`}
          >
            {starVal}
          </button>
        ))}
      </div>
    </div>
  );
}
