import { useState } from 'react';
import { matchesDocumentSearch } from '@rpd/shared';
import { useCatalog } from '../catalog/catalog-provider.js';
import { DocumentRow, EducationCard, SearchField } from '../components/mobile-ui.js';
import { useDocumentPreferences } from '../storage/use-document-preferences.js';

export function HomePage() {
  const { documents } = useCatalog();
  const { recent } = useDocumentPreferences(documents);
  const [query, setQuery] = useState('');
  const results = query.trim() ? documents.filter((document) => matchesDocumentSearch(document, query)) : [];
  const recentDocuments = recent.flatMap((entry) => documents.filter(({ id }) => id === entry.id));
  const context = (document: (typeof documents)[number]) => {
    const level = document.level === 'bachelor' ? 'Бакалавриат' : 'Магистратура';
    const program = document.program === 'corporate-law' ? 'Корпоративное право' : document.program === 'business-legal-support' ? 'Правовое сопровождение бизнеса' : null;
    return [level, program, `${document.course} курс`].filter(Boolean).join(' · ');
  };
  return <section className="screen"><h1 className="home-title">РПД</h1><p className="screen-subtitle">Рабочие программы дисциплин</p><SearchField id="catalog-search" value={query} onChange={setQuery} placeholder="Найти дисциплину" />{query.trim() ? results.length ? <div className="document-list" aria-label="Результаты поиска">{results.map((document) => <DocumentRow key={document.id} document={document} context={context(document)} />)}</div> : <p className="empty-state" role="status">Ничего не найдено</p> : <><div className="card-stack"><EducationCard to="/bachelor" kind="bachelor" title="Бакалавриат" detail="5 курсов" /><EducationCard to="/master" kind="master" title="Магистратура" detail="2 программы" /></div>{recentDocuments.length > 0 && <section aria-labelledby="recent-heading"><h2 className="section-title" id="recent-heading">Недавно открывали</h2><div className="document-list">{recentDocuments.map((document) => <DocumentRow key={document.id} document={document} recent />)}</div></section>}</>}</section>;
}
