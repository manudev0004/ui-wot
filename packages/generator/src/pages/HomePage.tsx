import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export function HomePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleAddClick = () => {
    navigate('/td-input');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300`} style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="text-center">
        <h1 className={`text-6xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>WoT UI GENERATOR</h1>
        <p className="text-xl mb-8 font-medium transition-colors duration-300" style={{ color: 'var(--color-primary)' }}>
          Create dynamic user interfaces from Thing Descriptions
        </p>
        <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>Click the + button to get started</div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleAddClick}
        className="fixed bottom-8 right-8 w-16 h-16 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-2xl font-bold transform hover:scale-105"
        style={{
          backgroundColor: 'var(--color-primary)',
          boxShadow: theme === 'dark' ? '0 10px 15px -3px rgba(6, 115, 98, 0.25)' : '0 10px 15px -3px rgba(6, 115, 98, 0.3)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
        }}
        aria-label="Add new Thing Description"
      >
        +
      </button>
    </div>
  );
}
