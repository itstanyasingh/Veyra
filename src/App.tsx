import { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { CreateProjectPage } from './components/dashboard/CreateProjectPage';
import { VideoWorkspace } from './components/workspace/VideoWorkspace';
import { GlobalSearchPage } from './components/search/GlobalSearchPage';
import { StudyPage } from './components/study/StudyPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ToolsHubPage } from './components/tools/ToolsHubPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isWorkspace = currentPath.startsWith('/project/');

  const renderContent = () => {
    if (currentPath === '/' || currentPath === '') {
      return <LandingPage onNavigate={navigate} />;
    }

    if (currentPath === '/projects' || currentPath === '/videos') {
      return <DashboardPage onNavigate={navigate} />;
    }

    if (currentPath === '/projects/new') {
      return <CreateProjectPage onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/project/')) {
      const projectId = currentPath.replace('/project/', '').trim();
      return <VideoWorkspace projectId={projectId} onNavigate={navigate} />;
    }

    if (currentPath === '/search') {
      return <GlobalSearchPage onNavigate={navigate} />;
    }

    if (currentPath === '/study') {
      return <StudyPage onNavigate={navigate} />;
    }

    if (currentPath === '/settings') {
      return <SettingsPage onNavigate={navigate} />;
    }

    if (currentPath === '/tools' || currentPath.startsWith('/tools')) {
      return <ToolsHubPage onNavigate={navigate} />;
    }

    // Fallback 404
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center select-none">
        <h2 className="text-xl font-bold text-[#000000] mb-2">Page Not Found</h2>
        <p className="text-sm text-[#666666] mb-6">The requested path does not exist in VEYRA.</p>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-[#111111] underline cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  };

  if (isWorkspace) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-[#111111] selection:bg-[#111111] selection:text-white flex flex-col">
        <ErrorBoundary fallbackTitle="An error occurred in the workspace.">
          {renderContent()}
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#111111] selection:bg-[#111111] selection:text-white">
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <div className="flex-1 flex flex-col">
        <ErrorBoundary fallbackTitle="An error occurred loading this page.">
          {renderContent()}
        </ErrorBoundary>
      </div>
      <Footer onNavigate={navigate} />
    </div>
  );
}

