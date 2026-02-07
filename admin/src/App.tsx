import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignForm from './pages/CampaignForm';
import Creatives from './pages/Creatives';
import CreativeForm from './pages/CreativeForm';
import Placements from './pages/Placements';
import PlacementForm from './pages/PlacementForm';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/new" element={<CampaignForm />} />
        <Route path="/campaigns/:id/edit" element={<CampaignForm />} />
        <Route path="/creatives" element={<Creatives />} />
        <Route path="/creatives/new" element={<CreativeForm />} />
        <Route path="/creatives/:id/edit" element={<CreativeForm />} />
        <Route path="/placements" element={<Placements />} />
        <Route path="/placements/new" element={<PlacementForm />} />
        <Route path="/placements/:id/edit" element={<PlacementForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
