export default function TableRow({ children, renderActions }) {
  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      {children}
      {renderActions && (
        <td className="px-6 py-4">
          <div className="flex items-center justify-end">
            {renderActions()}
          </div>
        </td>
      )}
    </tr>
  );
}