export default function EntityPanel({ entities, onSelect }) {
  return (
    <>
      {Object.entries(entities).map(([type, values]) =>
        values?.length ? (
          <div key={type} className="mb-4">
            <h3 className="text-sm uppercase text-gray-400 mb-1">
              {type}
            </h3>
            {values.map((v, i) => (
              <button
                key={i}
                onClick={() => onSelect(v)}
                className="block text-left text-blue-400 hover:underline"
              >
                {v}
              </button>
            ))}
          </div>
        ) : null
      )}
    </>
  );
}
