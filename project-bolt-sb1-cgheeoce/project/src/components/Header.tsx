import React from 'react';
import { LogOut, Package, BarChart3, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  userEmail: string;
}

export default function Header({ currentView, onViewChange, onLogout, userEmail }: HeaderProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const navItems = [
    { id: 'stock', label: 'Stock Management', icon: Package },
    { id: 'analytics', label: 'Analitica', icon: BarChart3 },
    { id: 'upload', label: 'Incarca Documente', icon: Upload },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Stockzilla</h1>
            </div>
            
            <nav className="flex space-x-4">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewChange(id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Iesi din cont</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}