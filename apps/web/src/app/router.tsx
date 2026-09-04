import { Route, Routes } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { DocumentPage } from '../pages/document-page.js';
import { BachelorPage, CoursePage, MasterPage, NotFound } from '../pages/education-pages.js';
import { HomePage } from '../pages/home-page.js';
import { FavoritesPage, ProfilePage } from '../pages/static-pages.js';
export function AppRoutes() { const { status, retry } = useCatalog(); if (status === 'loading') return <p className="empty-state" role="status">Загружаем каталог…</p>; if (status === 'error') return <section className="screen" role="alert"><h1 className="home-title">Не удалось загрузить каталог</h1><p className="empty-state">Проверьте соединение и попробуйте снова.</p><button className="action-button primary" onClick={retry}>Повторить</button></section>; return <Routes><Route path="/" element={<HomePage />} /><Route path="/bachelor" element={<BachelorPage />} /><Route path="/bachelor/:course" element={<CoursePage level="bachelor" />} /><Route path="/master" element={<MasterPage />} /><Route path="/master/:program/:course" element={<CoursePage level="master" />} /><Route path="/document/:documentId" element={<DocumentPage />} /><Route path="/favorites" element={<FavoritesPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="*" element={<NotFound />} /></Routes>; }
