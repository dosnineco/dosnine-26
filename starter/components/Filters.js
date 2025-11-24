import { FiFilter } from 'react-icons/fi';

export default function Filters({ parishes = [], onChange }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const filters = {
      parish: fd.get('parish') || '',
      minPrice: fd.get('minPrice') || '',
      maxPrice: fd.get('maxPrice') || ''
    };
    onChange(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 flex gap-3 flex-wrap items-end mb-8">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
        <select name="parish" className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent">
          <option value="">All Parishes</option>
          {parishes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
        <input 
          name="minPrice" 
          type="number"
          placeholder="0" 
          className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent" 
        />
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
        <input 
          name="maxPrice" 
          type="number"
          placeholder="Any" 
          className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent" 
        />
      </div>

      <button type="submit" className="bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-700 transition font-medium flex items-center gap-2">
        <FiFilter size={16} />
        Apply
      </button>
    </form>
  );
}
