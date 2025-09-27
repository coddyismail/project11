import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import EightDConverter from "./EightDConverter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/convert" element={<EightDConverter />} />
      </Routes>
    </Router>
  );
}
