import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, MeshDistortMaterial, Sphere } from "@react-three/drei";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    setMenuOpen(false); // close menu on click
    document.getElementById(id).scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="home-page">
      {/* Three.js Background */}
      <Canvas className="three-canvas">
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} />
        <Sphere args={[1, 64, 64]} scale={2}>
          <MeshDistortMaterial
            color="#ff4d4d"
            attach="material"
            distort={0.5}
            speed={2}
            roughness={0}
          />
        </Sphere>
        <OrbitControls enableZoom={false} />
      </Canvas>

      {/* Navigation */}
     {/* Navigation */}
<nav className="navbar">
  <div className="nav-logo">🎧 8D Studio</div>

  {/* Nav Links */}
  <div className={`nav-links ${menuOpen ? "open" : ""}`}>
    <span onClick={() => scrollTo("hero")}>Home</span>
    <span onClick={() => scrollTo("about")}>About</span>
    <span onClick={() => scrollTo("faq")}>FAQ</span>
    <span onClick={() => navigate("/convert")}>Convert</span>
  </div>

  {/* Hamburger */}
  <div
    className={`hamburger ${menuOpen ? "open" : ""}`}
    onClick={() => setMenuOpen(!menuOpen)}
  >
    <div></div>
    <div></div>
    <div></div>
  </div>
</nav>


      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="home-content">
          <div className="content-wrapper hero-text">
            <h1>Transform Your Music into 8D</h1>
            <p>
              Experience audio like never before — immersive, dynamic, and alive.
              Let your music move in space.
            </p>
            <div className="cta-buttons">
              <button className="btn-primary" onClick={() => navigate("/convert")}>
                 Start Converting
              </button>
              <button className="btn-secondary" onClick={() => scrollTo("about")}>
                 Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <h2>How This Works</h2>
        <div className="about-content">
          <p>
            Our 8D Audio Studio transforms regular audio files into immersive sound experiences.
            By manipulating spatial audio effects and adding dynamic distortion,
            we create a rich soundscape that makes it feel like the music moves around you.
          </p>
          <p>
            Simply upload your track, let our system process it, and enjoy
            an entirely new way to experience music.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>What is 8D audio?</h3>
          <p>
            8D audio is a sound effect that creates the illusion of the music
            moving around you, giving a 3D-like immersive experience.
          </p>
        </div>
        <div className="faq-item">
          <h3>Do I need special headphones?</h3>
          <p>
            Yes — for the best experience, use headphones so the spatial effects are clear.
          </p>
        </div>
        <div className="faq-item">
          <h3>Is it free?</h3>
          <p>
            Yes — Compleatly Free, Garib Ke liye hai
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>© 2025 8D Audio Studio. All rights reserved.</p>
        <div className="social-links">
         <a className="atkmbg" href="https://www.instagram.com/coderismail"> <span>Instagram</span></a> | <a className="atkmbg" href="https://www.github.com/coddyismail"> <span>GitHub</span></a>
        </div>
      </footer>
    </div>
  );
}
