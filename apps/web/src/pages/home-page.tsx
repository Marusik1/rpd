import { useState } from 'react';
import { matchesDocumentSearch } from '@rpd/shared';
import { Link } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { useDocumentPreferences } from '../storage/use-document-preferences.js';

export function HomePage() {
  const { documents } = useCatalog(); const { recent } = useDocumentPreferences(documents); const [query, setQuery] = useState('');
  const results = query.trim() ? documents.filter((document) => matchesDocumentSearch(document, query)) : [];
  const recentDocuments = recent.flatMap((entry) => documents.filter(({ id }) => id === entry.id));
  return <section><h1>Рабочие программы дисциплин</h1><label htmlFor="catalog-search">Поиск по дисциплине или коду</label><input id="catalog-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />{query && <button type="button" onClick={() => setQuery('')}>Очистить</button>}{query.trim() ? results.length ? <section aria-label="Результаты поиска"><ul>{results.map((document) => <li key={document.id}><Link to={`/document/${document.id}`}>{document.name}</Link>{document.code && <small> {document.code}</small>}<p>{document.level === 'bachelor' ? 'Бакалавриат' : 'Магистратура'}, {document.course} курс</p></li>)}</ul></section> : <p role="status">Ничего не найдено</p> : <ul><li><Link to="/bachelor">Бакалавриат</Link></li><li><Link to="/master">Магистратура</Link></li></ul>}{!query.trim() && recentDocuments.length > 0 && <section aria-labelledby="recent-heading"><h2 id="recent-heading">Недавно открытые</h2><ol>{recentDocuments.map((document) => <li key={document.id}><Link to={`/document/${document.id}`}>{document.name}</Link></li>)}</ol></section>}</section>;
}
