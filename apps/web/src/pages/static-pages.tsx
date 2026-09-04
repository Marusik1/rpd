import { Link } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { useDocumentPreferences } from '../storage/use-document-preferences.js';
export const FavoritesPage = () => { const { documents } = useCatalog(); const { favoriteIds, toggleFavorite } = useDocumentPreferences(documents); const favorites = favoriteIds.flatMap((id) => documents.filter((document) => document.id === id)); return <section><h1>Избранное</h1>{favorites.length ? <ul>{favorites.map((document) => <li key={document.id}><Link to={`/document/${document.id}`}>{document.name}</Link><button type="button" onClick={() => toggleFavorite(document.id)}>Удалить</button></li>)}</ul> : <p>Пока пусто</p>}</section>; };
export const ProfilePage = () => <section><h1>Профиль</h1><p>Веб-версия</p></section>;
