
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import GeneratorPage from '@/pages/Generator';
import CoursesPage from '@/pages/Courses';
import CourseDetailPage from '@/pages/CourseDetail';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/query-provider';

function App() {
  return (
    <QueryProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/generator" replace />} />
            <Route path="/generator" element={<GeneratorPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          </Routes>
        </Layout>
        <Toaster />
      </Router>
    </QueryProvider>
  );
}

export default App;
