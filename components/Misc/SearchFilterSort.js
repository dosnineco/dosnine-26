export default function SearchFilterSort({ searchQuery, setSearchQuery, filter, setFilter, sortBy, setSortBy }) {
  return (
    <div className="text-inherit flex flex-col sm:flex-row md:flex-row justify-end items-center mb-4 space-y-4 md:space-y-0">
      <input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-12 bg-white mx-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All</option>
        <option value="pinned">Pinned</option>
        <option value="unpinned">Unpinned</option>
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="h-12 px-3 bg-white py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="date_created">Date Created</option>
        <option value="usage_count">Most Used</option>
      </select>
    </div>
  );
}