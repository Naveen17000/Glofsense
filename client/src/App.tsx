import React, { useState } from 'react';
import { Menu, ChevronDown, GaugeCircle, Satellite, Mountain, Camera } from 'lucide-react';
import SensorDashboard from './components/SensorDashboard';
import Navbar from './components/Navbar';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedLake, setSelectedLake] = useState('Shisper Lake');
  const [activePage, setActivePage] = useState('dashboard');

  const lakes = [
    'Shisper Lake',
    'Khurdopin Lake',
    'Passu Lake',
    'Batura Lake'
  ];

  const navigationItems = [
    { id: 'dashboard', label: 'Sensor Dashboard', icon: <GaugeCircle className="w-5 h-5" /> },
    { id: 'sar', label: 'SAR based Prediction', icon: <Satellite className="w-5 h-5" /> },
    { id: 'dem', label: 'DEM Analysis', icon: <Mountain className="w-5 h-5" /> },
    { id: 'camera', label: 'Camera Interface', icon: <Camera className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        selectedLake={selectedLake}
        setSelectedLake={setSelectedLake}
        lakes={lakes}
        navigationItems={navigationItems}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="p-4 sm:ml-64 pt-20">
        {activePage === 'dashboard' && (
          <SensorDashboard selectedLake={selectedLake} />
        )}
        {activePage === 'sar' && (
          <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">SAR based Prediction</h2>
            <p>Streamlit integration coming soon...</p>
          </div>
        )}
        {activePage === 'dem' && (
          <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">DEM Analysis</h2>
            <div className="w-full h-[600px] border rounded-lg shadow-lg">
              <iframe
                src="https://dem-flow.streamlit.app/"
                width="100%"
                height="100%"
                style={{ border: "none", borderRadius: "8px" }}
              />
            </div>
          </div>
        )}
        {activePage === 'camera' && (
          <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Camera Interface</h2>
            <p>Camera feed integration coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;