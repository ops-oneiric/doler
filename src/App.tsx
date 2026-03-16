import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { Sidebar } from './components/Sidebar';
import { QueueView } from './views/Queue/QueueView';
import { AssociatesView } from './views/Associates/AssociatesView';
import { ClientsView } from './views/Clients/ClientsView';
import { ProspectsView } from './views/Prospects/ProspectsView';
import { EngineView } from './views/Engine/EngineView';
import { SettingsView } from './views/Settings/SettingsView';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<QueueView />} />
              <Route path="/associates" element={<AssociatesView />} />
              <Route path="/clients" element={<ClientsView />} />
              <Route path="/prospects" element={<ProspectsView />} />
              <Route path="/engine" element={<EngineView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
