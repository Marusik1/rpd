import { useCatalog } from '../catalog/catalog-provider.js';
import { DocumentRow, ScreenHeading } from '../components/mobile-ui.js';
import { useDocumentPreferences } from '../storage/use-document-preferences.js';
export function FavoritesPage() { const { documents } = useCatalog(); const { favoriteIds } = useDocumentPreferences(documents); const favorites = favoriteIds.flatMap((id) => documents.filter((document) => document.id === id)); return <section className="screen"><ScreenHeading title="Избранное" />{favorites.length ? <div className="document-list">{favorites.map((document) => <DocumentRow key={document.id} document={document} />)}</div> : <p className="empty-state">Здесь появятся сохранённые РПД</p>}</section>; }
export function ProfilePage() { return <section className="screen"><ScreenHeading title="Профиль" /><p className="empty-state">Веб-версия РПД</p></section>; }
