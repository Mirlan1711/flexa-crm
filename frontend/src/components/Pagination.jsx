export default function Pagination({ page, count, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return <p className="list-count">Всего записей: {count}</p>;
  return <div className="pagination"><span>Показано записей: {count}</span><div><button className="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Назад</button><strong>Страница {page} из {totalPages}</strong><button className="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Вперёд</button></div></div>;
}
