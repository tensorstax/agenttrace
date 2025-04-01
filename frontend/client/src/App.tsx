import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Traces from './pages/Traces';
import Sessions from './pages/Sessions';
import Evaluations from './pages/Evaluations';
import Performance from './pages/Performance';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/traces" element={<Traces />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/evaluations" element={<Evaluations />} />
        <Route path="/performance" element={<Performance />} />
      </Route>
    </Routes>
  );
};

export default App;
