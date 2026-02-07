import { Link, useLocation } from 'react-router-dom';

const segmentLabels: Record<string, string> = {
  campaigns: 'Кампании',
  creatives: 'Креативы',
  placements: 'Площадки',
  new: 'Новая',
  edit: 'Редактирование',
};

function getLabel(segment: string, prevSegment: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment];
  if (segment === 'new') {
    if (prevSegment === 'campaigns') return 'Новая кампания';
    if (prevSegment === 'creatives') return 'Новый креатив';
    if (prevSegment === 'placements') return 'Новая площадка';
    return 'Новая';
  }
  if (segment === 'edit') return 'Редактирование';
  if (segment.match(/^\d+$/)) return 'Редактирование';
  return segment;
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const items: { label: string; to: string }[] = [];
  let acc = '';
  for (let i = 0; i < segments.length; i++) {
    acc += '/' + segments[i];
    const label = getLabel(segments[i], segments[i - 1] ?? '');
    items.push({ label, to: acc });
  }

  if (items.length === 0) {
    return (
      <nav aria-label="Хлебные крошки" className="text-sm text-gray-500 mb-4">
        <span>Дашборд</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Хлебные крошки" className="text-sm text-gray-500 mb-4">
      <Link to="/" className="text-gray-500 hover:text-indigo-600 transition-colors">
        Дашборд
      </Link>
      {items.map((item, i) => (
        <span key={item.to}>
          <span className="mx-2 text-gray-400">/</span>
          {i === items.length - 1 ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : (
            <Link to={item.to} className="text-gray-500 hover:text-indigo-600 transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
