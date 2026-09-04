import { Route, Routes } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog-provider.js';
import { DocumentPage } from '../pages/document-page.js';
import { BachelorPage, CoursePage, MasterPage, NotFound } from '../pages/education-pages.js';
import { HomePage } from '../pages/home-page.js';
import { FavoritesPage, ProfilePage } from '../pages/static-pages.js';

export function AppRoutes() { const { status, retry } = useCatalog(); if (status === 'loading') return <p role="status">Загружаем каталог…</p>; if (status === 'error') return <section role="alert"><h1>Не удалось загрузить каталог</h1><button onClick={retry}>Повторить</button></section>; return <Routes><Route path="/" element={<HomePage />} /><Route path="/bachelor" element={<BachelorPage />} /><Route path="/bachelor/:course" element={<CoursePage level="bachelor" />} /><Route path="/master" element={<MasterPage />} /><Route path="/master/:program/:course" element={<CoursePage level="master" />} /><Route path="/document/:documentId" element={<DocumentPage />} /><Route path="/favorites" element={<FavoritesPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="*" element={<NotFound />} /></Routes>; }
