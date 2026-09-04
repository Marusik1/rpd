import { Link } from 'react-router-dom';
export function HomePage() { return <section><h1>Рабочие программы дисциплин</h1><ul><li><Link to="/bachelor">Бакалавриат</Link></li><li><Link to="/master">Магистратура</Link></li></ul></section>; }
