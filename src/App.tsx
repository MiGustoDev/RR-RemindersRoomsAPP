import { Login } from './components/Login';
import { useAuth } from './lib/auth';
import { ReminderApp } from './ReminderApp';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-4 border-blue-400 dark:border-blue-600 opacity-20"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return <ReminderApp />;
}

export default App;
