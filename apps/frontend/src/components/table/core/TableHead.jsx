export default function TableHead({ columns = [] }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        {columns.map((col, index) => {
          const isActionCol =
            col === "Action" || col === "Actions"; // ✅ dono handle

          return (
            <th
              key={index}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                isActionCol
                  ? "text-right w-[100px]"
                  : "text-left w-auto"
              }`}
            >
              {col}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}