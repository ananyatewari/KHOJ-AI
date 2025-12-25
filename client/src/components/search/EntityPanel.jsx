export default function EntityPanel({ entities, onSelect }) {
  return (
    <div className="bg-gray-900 p-4 rounded h-[80vh] overflow-y-auto">
      <h2 className="font-semibold mb-3">Entities</h2>

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
    </div>
  );
}
