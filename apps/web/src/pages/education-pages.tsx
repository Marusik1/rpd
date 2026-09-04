import { useState } from 'react';
import { matchesDocumentSearch } from '@rpd/shared';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { bachelorCourses, documentsForCourse, isMasterProgram, masterCourses, masterPrograms } from '../catalog/selectors.js';

const CourseLinks = ({ prefix, courses }: { prefix: string; courses: readonly number[] }) => <ul>{courses.map((course) => <li key={course}><Link to={`${prefix}/${course}`}>{course} курс</Link></li>)}</ul>;
export function BachelorPage() { return <section><h1>Бакалавриат</h1><CourseLinks prefix="/bachelor" courses={bachelorCourses} /><Link to="/">На главную</Link></section>; }
export function MasterPage() { return <section><h1>Магистратура</h1><ul>{masterPrograms.map(({ slug, name }) => <li key={slug}><h2>{name}</h2><CourseLinks prefix={`/master/${slug}`} courses={masterCourses} /></li>)}</ul><Link to="/">На главную</Link></section>; }
export function CoursePage({ level }: { level: 'bachelor' | 'master' }) {
  const { course: rawCourse, program } = useParams(); const course = Number(rawCourse); const { documents } = useCatalog();
  const [query, setQuery] = useState('');
  const valid = Number.isInteger(course) && (level === 'bachelor' ? bachelorCourses.includes(course as never) : masterCourses.includes(course as never)) && (level === 'bachelor' || isMasterProgram(program));
  if (!valid) return <NotFound />;
  const selected = documentsForCourse(documents, level, level === 'master' ? program as never : null, course);
  const filtered = selected.filter((document) => matchesDocumentSearch(document, query));
  const back = level === 'bachelor' ? '/bachelor' : '/master';
  return <section><h1>{course} курс</h1>{selected.length ? <><label htmlFor="course-search">Поиск по дисциплине или коду</label><input id="course-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />{query && <button type="button" onClick={() => setQuery('')}>Очистить</button>}{filtered.length ? <ul>{filtered.map((item) => <li key={item.id}><Link to={`/document/${item.id}`} state={{ back }}>{item.name}</Link>{item.code && <small> {item.code}</small>}</li>)}</ul> : <p role="status">Ничего не найдено</p>}</> : <p>Пока нет загруженных РПД для этого курса</p>}<Link to={back}>Назад</Link> <Link to="/">На главную</Link></section>;
}
export function NotFound() { return <section><h1>Страница не найдена</h1><Link to="/">На главную</Link></section>; }
