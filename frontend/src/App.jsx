/**
 * App — root layout, routing, and global chrome.
 *
 * Layout: left sidebar (ChapterNav) + main content area on desktop.
 * On mobile: ChapterNav collapses to a horizontal strip at the top.
 */

import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TextReader from './pages/TextReader';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:source_id" element={<TextReader />} />
    </Routes>
  );
}
