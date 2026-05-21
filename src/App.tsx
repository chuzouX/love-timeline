import Layout from './components/Layout';
import Calendar from './pages/Calendar';
import Gallery from './pages/Gallery';
import Home from './pages/Home';
import PeriodTracker from './pages/PeriodTracker';
import Schedule from './pages/Schedule';

const sectionClass =
  'scroll-mt-24 md:scroll-mt-28 w-full min-w-0 glass-panel rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-10 shadow-kuromi-lg';

function App() {
  return (
    <Layout>
      <section id="home" className={sectionClass}>
        <Home />
      </section>
      <section id="gallery" className={sectionClass}>
        <Gallery />
      </section>
      <section id="calendar" className={sectionClass}>
        <Calendar />
      </section>
      <section id="period" className={sectionClass}>
        <PeriodTracker />
      </section>
      <section id="schedule" className={sectionClass}>
        <Schedule />
      </section>
    </Layout>
  );
}

export default App;
