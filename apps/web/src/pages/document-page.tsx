import { useEffect } from 'react';
import { CheckCircle2, FileText, Send, Star } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { InlineNotice, ScreenHeading } from '../components/mobile-ui.js';
import { findDocument } from '../catalog/selectors.js';
import { useDocumentPreferences } from '../storage/use-document-preferences.js';
import { useOpenDocument } from '../documents/use-open-document.js';
import { useSendDocument } from '../documents/use-send-document.js';

function DocumentActions({ document }: { document: NonNullable<ReturnType<typeof findDocument>> }) {
  const opening = useOpenDocument(document); const sending = useSendDocument(document.id);
  return <section className="document-actions" aria-label="Действия с документом"><button className="action-button primary tap" type="button" disabled={opening.status === 'checking'} aria-busy={opening.status === 'checking'} onClick={() => void opening.open()}><FileText size={18} />{opening.status === 'checking' ? 'Проверяем документ…' : 'Открыть РПД'}</button>{opening.status === 'unavailable' && <InlineNotice kind="error">Документ временно недоступен.<button type="button" onClick={() => void opening.open()}>Повторить</button></InlineNotice>}{opening.verifiedUrl && <a className="action-button" href={opening.verifiedUrl} target="_blank" rel="noopener noreferrer">Открыть проверенный PDF</a>}<button className="action-button tap" type="button" disabled={sending.state.status === 'sending'} aria-busy={sending.state.status === 'sending'} onClick={() => void sending.send()}><Send size={18} />{sending.state.status === 'sending' ? 'Отправляем…' : 'Получить в Telegram'}</button>{sending.state.status === 'success' && <InlineNotice kind="success"><CheckCircle2 size={19} />{sending.state.message}</InlineNotice>}{sending.state.status === 'error' && <InlineNotice kind="error">{sending.state.message}<button type="button" onClick={() => void sending.send()}>Повторить</button></InlineNotice>}</section>;
}

export function DocumentPage() {
  const { documentId = '' } = useParams(); const { documents } = useCatalog(); const location = useLocation(); const document = findDocument(documents, documentId); const { favoriteIds, toggleFavorite, recordRecent } = useDocumentPreferences(documents);
  useEffect(() => { if (document) recordRecent(document.id); }, [document?.id, recordRecent]);
  if (!document) return <section className="screen"><ScreenHeading title="Документ не найден" /><Link className="action-button primary" to="/">На главную</Link></section>;
  const back = (location.state as { back?: string } | null)?.back ?? (document.level === 'bachelor' ? `/bachelor/${document.course}` : `/master/${document.program}/${document.course}`); const favorite = favoriteIds.includes(document.id);
  return <article className="screen"><ScreenHeading title="" back={back} /><div className="detail-head"><div className="detail-file-icon"><FileText size={34} /></div><div><h1>{document.name}</h1>{document.code && <p className="detail-meta">{document.code}</p>}<p className="detail-meta">Рабочая программа дисциплины</p><div className="badges"><span className="badge brand">{document.level === 'bachelor' ? 'Бакалавриат' : 'Магистратура'}</span><span className="badge">{document.course} курс</span></div></div><button className="favorite-button tap" type="button" aria-label={favorite ? 'Удалить из избранного' : 'Добавить в избранное'} aria-pressed={favorite} onClick={() => toggleFavorite(document.id)}><Star size={22} fill={favorite ? 'currentColor' : 'none'} /></button></div><DocumentActions document={document} /></article>;
}
