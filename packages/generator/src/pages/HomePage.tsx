import { useAppContext } from '../context/AppContext';

export function HomePage() {
  const { dispatch } = useAppContext();

  const handleAddClick = () => {
    dispatch({ type: 'SET_VIEW', payload: 'td-input' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          WoT UI Generator
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Create dynamic user interfaces from Thing Descriptions
        </p>
        <div className="text-gray-500">
          Click the + button to get started
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleAddClick}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl font-bold"
        aria-label="Add new Thing Description"
      >
        +
      </button>
    </div>
  );
}
