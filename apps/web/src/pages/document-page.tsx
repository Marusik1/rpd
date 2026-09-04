import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { findDocument } from '../catalog/selectors.js';
import { useDocumentPreferences } from '../storage/use-document-preferences.js';
import { useOpenDocument } from '../documents/use-open-document.js';
import { useSendDocument } from '../documents/use-send-document.js';

function DocumentActions({ document }: { document: NonNullable<ReturnType<typeof findDocument>> }) {
  const opening = useOpenDocument(document); const sending = useSendDocument(document.id);
  return <section aria-label="Действия с документом">
    <button type="button" disabled={opening.status === 'checking'} onClick={() => void opening.open()}>{opening.status === 'checking' ? 'Проверяем документ…' : 'Открыть РПД'}</button>
    {opening.status === 'unavailable' && <p role="alert">Документ временно недоступен. <button type="button" onClick={() => void opening.open()}>Повторить</button></p>}
    {opening.verifiedUrl && <a href={opening.verifiedUrl} target="_blank" rel="noopener noreferrer">Открыть проверенный PDF</a>}
    <button type="button" disabled={sending.state.status === 'sending'} onClick={() => void sending.send()}>{sending.state.status === 'sending' ? 'Отправляем…' : 'Получить в Telegram'}</button>
    {sending.state.status === 'success' && <p role="status">{sending.state.message}</p>}
    {sending.state.status === 'error' && <p role="alert">{sending.state.message} <button type="button" onClick={() => void sending.send()}>Повторить</button></p>}
  </section>;
}

export function DocumentPage() { const { documentId = '' } = useParams(); const { documents } = useCatalog(); const location = useLocation(); const document = findDocument(documents, documentId); const { favoriteIds, toggleFavorite, recordRecent } = useDocumentPreferences(documents); useEffect(() => { if (document) recordRecent(document.id); }, [document?.id, recordRecent]); if (!document) return <section><h1>Документ не найден</h1><Link to="/">На главную</Link></section>; const back = (location.state as { back?: string } | null)?.back ?? (document.level === 'bachelor' ? `/bachelor/${document.course}` : `/master/${document.program}/${document.course}`); const favorite = favoriteIds.includes(document.id); return <article><h1>{document.name}</h1>{document.code && <p>{document.code}</p>}<p>{document.filename}</p><DocumentActions document={document} /><button type="button" aria-pressed={favorite} onClick={() => toggleFavorite(document.id)}>{favorite ? 'Удалить из избранного' : 'Добавить в избранное'}</button> <Link to={back}>Назад</Link> <Link to="/">На главную</Link></article>; }
